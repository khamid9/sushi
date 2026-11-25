import json
import logging

from pywebpush import WebPushException, webpush
from requests.exceptions import RequestException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.config import settings
from app.models import AdminPushSubscription, Order

logger = logging.getLogger(__name__)


def notify_admins_of_order(db: Session, order: Order) -> None:
    if not settings.vapid_public_key or not settings.vapid_private_key:
        logger.warning('Web Push skipped: VAPID keys are not configured')
        return

    subscriptions = db.query(AdminPushSubscription).all()
    if not subscriptions:
        return

    payload = json.dumps({
        'title': 'Новый заказ',
        'body': f'Заказ № {order.id} — {float(order.total):,.0f} сом'.replace(',', ' '),
        'url': '/admin?section=orders',
        'tag': f'order-{order.id}',
    }, ensure_ascii=False)
    removed_subscription = False

    for subscription in subscriptions:
        try:
            webpush(
                subscription_info={
                    'endpoint': subscription.endpoint,
                    'keys': {
                        'p256dh': subscription.p256dh,
                        'auth': subscription.auth_key,
                    },
                },
                data=payload,
                vapid_private_key=settings.vapid_private_key,
                vapid_claims={'sub': settings.vapid_subject},
                ttl=60,
                timeout=5,
            )
        except (WebPushException, RequestException, ValueError) as error:
            status_code = getattr(getattr(error, 'response', None), 'status_code', None)
            logger.warning(
                'Web Push delivery failed (status=%s, error=%s)',
                status_code,
                type(error).__name__,
            )
            if status_code in (404, 410):
                db.delete(subscription)
                removed_subscription = True

    if removed_subscription:
        try:
            db.commit()
        except SQLAlchemyError:
            db.rollback()
            logger.exception('Could not remove expired Web Push subscriptions')
