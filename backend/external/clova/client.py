import os
import time
import uuid
import logging
from typing import Optional

import requests


logger = logging.getLogger(__name__)


class ClovaOCRClient:
    """Simple wrapper for Naver Clova OCR V2 API."""

    def __init__(self):
        self.ocr_url = os.environ.get("CLOVA_OCR_URL")
        self.ocr_secret = os.environ.get("CLOVA_OCR_SECRET")

    @property
    def is_configured(self) -> bool:
        return bool(self.ocr_url and self.ocr_secret)

    def analyze_image(self, image_base64: str, image_format: str = "jpg") -> Optional[dict]:
        """Sends image to Clova OCR and returns the raw response JSON."""
        if not self.is_configured:
            logger.warning("Clova OCR is not configured.")
            return None

        payload = {
            "version": "V2",
            "requestId": str(uuid.uuid4()),
            "timestamp": int(time.time() * 1000),
            "images": [
                {
                    "format": image_format,
                    "name": "challenge_photo",
                    "data": image_base64,
                }
            ],
        }

        try:
            response = requests.post(
                self.ocr_url,
                headers={
                    "Content-Type": "application/json",
                    "X-OCR-SECRET": self.ocr_secret,
                },
                json=payload,
                timeout=20,
            )
            response.raise_for_status()
            return response.json()
        except Exception as exc:
            logger.warning("Clova OCR request failed: %s", exc)
            return None

    def extract_text(self, image_base64: str, image_format: str = "jpg") -> Optional[str]:
        """Sends image to Clova OCR and returns concatenated text."""
        data = self.analyze_image(image_base64=image_base64, image_format=image_format)
        if not data:
            return None

        return self._extract_text_from_response(data)

    def _extract_text_from_response(self, data: dict) -> Optional[str]:
        images = data.get("images") or []
        if not images:
            return None

        first = images[0] or {}
        if first.get("inferResult") == "ERROR":
            logger.warning("Clova OCR inferResult ERROR: %s", first.get("message"))
            return None

        raw_fields = first.get("fields") or []
        fields = []
        for field in raw_fields:
            text = (field.get("inferText") or "").strip()
            if not text:
                continue

            vertices = ((field.get("boundingPoly") or {}).get("vertices") or [])
            x = vertices[0].get("x", 0) if vertices else 0
            y = vertices[0].get("y", 0) if vertices else 0

            if len(vertices) >= 3:
                height = abs((vertices[2].get("y", 0) or 0) - (vertices[0].get("y", 0) or 0))
            else:
                height = 20

            fields.append(
                {
                    "text": text,
                    "x": x,
                    "y": y,
                    "height": height or 20,
                }
            )

        if not fields:
            return None

        fields.sort(key=lambda item: (item["y"], item["x"]))

        avg_height = sum(item["height"] for item in fields) / len(fields)
        line_threshold = avg_height * 0.7 if avg_height > 0 else 20

        lines = []
        current_line = []
        last_y = -1000

        for field in fields:
            if field["y"] - last_y > line_threshold and current_line:
                current_line.sort(key=lambda item: item["x"])
                lines.append(" ".join(item["text"] for item in current_line))
                current_line = []

            current_line.append(field)
            last_y = field["y"]

        if current_line:
            current_line.sort(key=lambda item: item["x"])
            lines.append(" ".join(item["text"] for item in current_line))

        return "\n".join(lines).strip() if lines else None
