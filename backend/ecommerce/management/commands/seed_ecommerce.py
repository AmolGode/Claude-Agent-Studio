from django.core.management.base import BaseCommand
from ecommerce.models import Customer, Order, OrderItem


SEED_DATA = [
    {
        "name": "Alice Johnson",
        "email": "alice@example.com",
        "phone": "+1-555-0101",
        "orders": [
            {
                "status": "shipped",
                "shipping_address": "12 Oak Street, Austin, TX 73301",
                "items": [
                    {"product_name": "Wireless Headphones", "quantity": 1, "price": "89.99"},
                    {"product_name": "Phone Case", "quantity": 2, "price": "14.99"},
                ],
            },
            {
                "status": "delivered",
                "shipping_address": "12 Oak Street, Austin, TX 73301",
                "items": [
                    {"product_name": "USB-C Hub", "quantity": 1, "price": "49.99"},
                ],
            },
        ],
    },
    {
        "name": "Bob Martinez",
        "email": "bob@example.com",
        "phone": "+1-555-0202",
        "orders": [
            {
                "status": "pending",
                "shipping_address": "88 Maple Ave, Denver, CO 80201",
                "items": [
                    {"product_name": "Mechanical Keyboard", "quantity": 1, "price": "129.00"},
                    {"product_name": "Mouse Pad XL", "quantity": 1, "price": "24.99"},
                ],
            },
        ],
    },
    {
        "name": "Carol Kim",
        "email": "carol@example.com",
        "phone": "+1-555-0303",
        "orders": [
            {
                "status": "delivered",
                "shipping_address": "5 Pine Road, Seattle, WA 98101",
                "items": [
                    {"product_name": "Smart Watch", "quantity": 1, "price": "199.99"},
                ],
            },
            {
                "status": "cancelled",
                "shipping_address": "5 Pine Road, Seattle, WA 98101",
                "items": [
                    {"product_name": "Laptop Stand", "quantity": 1, "price": "39.99"},
                    {"product_name": "Screen Cleaner Kit", "quantity": 1, "price": "12.99"},
                ],
            },
        ],
    },
]


class Command(BaseCommand):
    help = "Seed the database with dummy ecommerce data"

    def handle(self, *args, **options):
        if Customer.objects.exists():
            self.stdout.write("Ecommerce data already seeded. Skipping.")
            return

        for data in SEED_DATA:
            customer = Customer.objects.create(
                name=data["name"],
                email=data["email"],
                phone=data["phone"],
            )
            for order_data in data["orders"]:
                items = order_data.pop("items")
                total = sum(
                    float(i["price"]) * i["quantity"] for i in items
                )
                order = Order.objects.create(
                    customer=customer,
                    total_amount=round(total, 2),
                    **order_data,
                )
                for item in items:
                    OrderItem.objects.create(order=order, **item)

        self.stdout.write(self.style.SUCCESS("Ecommerce seed data created successfully."))
