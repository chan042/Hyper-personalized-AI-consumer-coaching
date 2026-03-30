from apps.shop.models import ShopItem


SHOP_ITEMS = [
    # Clothing
    {
        "name": "교복",
        "category": "CLOTHING",
        "price": 400,
        "is_rare": False,
        "image_url": "/images/items/school_uniform.png",
        "image_key": "school_uniform",
        "description": "엘리트처럼 보이는 교복입니다.",
        "is_active": True,
    },
    {
        "name": "회색 후드티",
        "category": "CLOTHING",
        "price": 300,
        "is_rare": False,
        "image_url": "/images/items/gray_hoodie.png",
        "image_key": "gray_hoodie",
        "description": "편안한 회색 후드티입니다.",
        "is_active": True,
    },
    {
        "name": "휴양지룩",
        "category": "CLOTHING",
        "price": 500,
        "is_rare": False,
        "image_url": "/images/items/summer.png",
        "image_key": "summer",
        "description": "휴양지에 온 듯한 느낌을 주는 하와이안 셔츠와 오리 튜브입니다.",
        "is_active": True,
    },
    {
        "name": "세종대왕 의상",
        "category": "CLOTHING",
        "price": 3000,
        "is_rare": True,
        "image_url": "/images/items/king.png",
        "image_key": "king",
        "description": "우리나라를 빛낸 세종대왕이 입었던 의상입니다.",
        "is_active": True,
    },
    # Item
    {
        "name": "검은 안경",
        "category": "ITEM",
        "price": 200,
        "is_rare": False,
        "image_url": "/images/items/black_glasses.png",
        "image_key": "black_glasses",
        "description": "지적인 이미지를 주는 검은 안경입니다.",
        "is_active": True,
    },
    {
        "name": "선글라스",
        "category": "ITEM",
        "price": 400,
        "is_rare": False,
        "image_url": "/images/items/sunglasses.png",
        "image_key": "sunglasses",
        "description": "멋진 느낌을 주는 선글라스입니다.",
        "is_active": True,
    },
    # Background
    {
        "name": "도서관 배경",
        "category": "BACKGROUND",
        "price": 800,
        "is_rare": False,
        "image_url": "/images/backgrounds/library.png",
        "image_key": "library",
        "description": "책이 가득한 도서관 배경입니다.",
        "is_active": True,
    },
    {
        "name": "우주 배경",
        "category": "BACKGROUND",
        "price": 5000,
        "is_rare": True,
        "image_url": "/images/backgrounds/space.png",
        "image_key": "space",
        "description": "은하수가 펼쳐진 우주 배경입니다.",
        "is_active": True,
    },
]


def seed_shop_items(prune=False):
    created = 0
    updated = 0
    active_item_names = []

    for item_data in SHOP_ITEMS:
        item, was_created = ShopItem.objects.update_or_create(
            name=item_data["name"],
            defaults=item_data,
        )
        active_item_names.append(item.name)

        if was_created:
            created += 1
        else:
            updated += 1

    deleted = 0
    if prune:
        deleted, _ = ShopItem.objects.exclude(name__in=active_item_names).delete()

    return {
        "created": created,
        "updated": updated,
        "deleted": deleted,
        "pruned": prune,
    }
