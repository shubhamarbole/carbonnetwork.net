"""
Internal Notifications Service Layer
Phase 7: Alerts + Workflow Automation
"""

from datetime import datetime
import logging
import uuid
from typing import Dict, List, Optional

from app.schemas.notification import NotificationCreate, NotificationResponse, NotificationType

logger = logging.getLogger("notifications.service")


class NotificationService:
    """Manages in-app notifications with read tracking and user isolation."""

    def __init__(self):
        self.notifications: Dict[str, NotificationResponse] = {}

    def create_notification(self, create_data: NotificationCreate) -> NotificationResponse:
        notif_id = create_data.notification_id or f"notif_{uuid.uuid4().hex[:10]}"
        now_iso = datetime.utcnow().isoformat()

        notif = NotificationResponse(
            notification_id=notif_id,
            user_id=create_data.user_id,
            organization_id=create_data.organization_id,
            type=create_data.type,
            title=create_data.title,
            message=create_data.message,
            resource_type=create_data.resource_type or "",
            resource_id=create_data.resource_id or "",
            read=create_data.read,
            created_at=now_iso
        )

        self.notifications[notif_id] = notif
        logger.info(f"Created notification {notif_id}: '{notif.title}' for user {notif.user_id}")
        return notif

    def list_notifications(
        self,
        organization_id: Optional[str] = None,
        user_id: Optional[str] = None,
        unread_only: bool = False
    ) -> List[NotificationResponse]:
        res = list(self.notifications.values())
        if organization_id:
            res = [n for n in res if n.organization_id == organization_id]
        if user_id:
            # Show notifications targeting this user or broadcasts to whole org (user_id=None)
            res = [n for n in res if n.user_id is None or n.user_id == user_id]
        if unread_only:
            res = [n for n in res if not n.read]

        res.sort(key=lambda n: n.created_at, reverse=True)
        return res

    def mark_as_read(self, notification_id: str) -> NotificationResponse:
        notif = self.notifications.get(notification_id)
        if not notif:
            raise ValueError(f"Notification {notification_id} not found")

        notif.read = True
        self.notifications[notification_id] = notif
        return notif

    def mark_all_read(self, organization_id: Optional[str] = None, user_id: Optional[str] = None) -> int:
        count = 0
        for notif in self.notifications.values():
            if organization_id and notif.organization_id != organization_id:
                continue
            if user_id and notif.user_id and notif.user_id != user_id:
                continue
            if not notif.read:
                notif.read = True
                count += 1
        return count


default_notification_service = NotificationService()
