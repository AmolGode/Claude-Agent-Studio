from tools.registry import register_tool


@register_tool
def get_customer_orders(customer_email: str) -> str:
    """List all orders for a customer by their email address. Returns order IDs, statuses, totals, and dates."""
    from ecommerce.models import Customer
    try:
        customer = Customer.objects.prefetch_related("orders").get(email=customer_email)
    except Customer.DoesNotExist:
        return f"No customer found with email '{customer_email}'."

    orders = customer.orders.all().order_by("-created_at")
    if not orders:
        return f"{customer.name} has no orders."

    lines = [f"Orders for {customer.name} ({customer_email}):"]
    for o in orders:
        lines.append(
            f"  Order #{o.id} | Status: {o.status} | Total: ${o.total_amount} | Date: {o.created_at.strftime('%Y-%m-%d')}"
        )
    return "\n".join(lines)


@register_tool
def get_order_details(order_id: int) -> str:
    """Get full details of a specific order including items, shipping address, and status."""
    from ecommerce.models import Order
    try:
        order = Order.objects.prefetch_related("items").select_related("customer").get(id=order_id)
    except Order.DoesNotExist:
        return f"Order #{order_id} not found."

    lines = [
        f"Order #{order.id}",
        f"  Customer: {order.customer.name}",
        f"  Status: {order.status}",
        f"  Shipping to: {order.shipping_address}",
        f"  Refund requested: {'Yes' if order.refund_requested else 'No'}",
        f"  Items:",
    ]
    for item in order.items.all():
        lines.append(f"    - {item.quantity}x {item.product_name} @ ${item.price} each")
    lines.append(f"  Total: ${order.total_amount}")
    return "\n".join(lines)


@register_tool
def cancel_order(order_id: int) -> str:
    """Cancel an order. Only pending or shipped orders can be cancelled."""
    from ecommerce.models import Order
    try:
        order = Order.objects.get(id=order_id)
    except Order.DoesNotExist:
        return f"Order #{order_id} not found."

    if order.status in ("delivered", "cancelled"):
        return f"Order #{order_id} cannot be cancelled — it is already {order.status}."

    order.status = "cancelled"
    order.save()
    return f"Order #{order_id} has been cancelled successfully."


@register_tool
def request_refund(order_id: int) -> str:
    """Request a refund for a cancelled order. Only cancelled orders are eligible."""
    from ecommerce.models import Order
    try:
        order = Order.objects.get(id=order_id)
    except Order.DoesNotExist:
        return f"Order #{order_id} not found."

    if order.status != "cancelled":
        return f"Refund can only be requested for cancelled orders. Order #{order_id} is '{order.status}'."

    if order.refund_requested:
        return f"A refund for order #{order_id} has already been requested."

    order.refund_requested = True
    order.save()
    return f"Refund for order #{order_id} (${order.total_amount}) has been successfully requested. It will be processed in 3-5 business days."


@register_tool
def update_shipping_address(order_id: int, new_address: str) -> str:
    """Update the shipping address for a pending order. Cannot update shipped or delivered orders."""
    from ecommerce.models import Order
    try:
        order = Order.objects.get(id=order_id)
    except Order.DoesNotExist:
        return f"Order #{order_id} not found."

    if order.status != "pending":
        return f"Shipping address can only be updated for pending orders. Order #{order_id} is '{order.status}'."

    old_address = order.shipping_address
    order.shipping_address = new_address
    order.save()
    return f"Shipping address for order #{order_id} updated.\n  From: {old_address}\n  To: {new_address}"
