# frontend/Dockerfile
#
# [파일 역할]
# - Cloud Run에서 `frontend/out` 정적 산출물을 서빙하는 이미지를 생성합니다.
# - 웹 스테이징 사이트는 이 Dockerfile을 기준으로 배포합니다.

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY out /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
