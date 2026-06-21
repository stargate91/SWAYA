import enum

class Gender(enum.Enum):
    """User profile gender identity."""
    MALE = "male"
    FEMALE = "female"
    NON_BINARY = "non_binary"
    OTHER = "other"

class SexualOrientation(enum.Enum):
    """User profile sexual orientation preferences."""
    STRAIGHT = "straight"
    GAY = "gay"
    LESBIAN = "lesbian"
    BISEXUAL = "bisexual"
    ASEXUAL = "asexual"
    PANSEXUAL = "pansexual"
    OTHER = "other"

class RelationshipGoal(enum.Enum):
    """What the user is looking for on the platform."""
    CASUAL = "casual"
    LONG_TERM = "long_term"
    FRIENDS = "friends"
    NOT_SURE = "not_sure"

class InteractionType(enum.Enum):
    """Actions performed on other user profiles."""
    LIKE = "like"
    DISLIKE = "dislike"
    SUPERLIKE = "superlike"

class MatchStatus(enum.Enum):
    """State of the connection between two users."""
    PENDING = "pending"       # One user liked, waiting for the other
    MATCHED = "matched"       # Both users liked each other
    REJECTED = "rejected"     # One user disliked
    UNMATCHED = "unmatched"   # Match deleted by one of the users

class MessageType(enum.Enum):
    """Type of message sent in the chat."""
    TEXT = "text"
    IMAGE = "image"
    AUDIO = "audio"
    LOCATION = "location"
    SYSTEM = "system"

class MessageStatus(enum.Enum):
    """Delivery status of a message."""
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"

class VerificationStatus(enum.Enum):
    """Verification state of the user profile."""
    UNVERIFIED = "unverified"
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"

class AccountStatus(enum.Enum):
    """Administrative status of the user account."""
    ACTIVE = "active"
    SUSPENDED = "suspended"
    BANNED = "banned"
    SHADOWBANNED = "shadowbanned"
    DEACTIVATED = "deactivated"

class NotificationType(enum.Enum):
    """Category of push notifications."""
    NEW_MATCH = "new_match"
    NEW_MESSAGE = "new_message"
    LIKE_ALERT = "like_alert"
    SYSTEM_ANNOUNCEMENT = "system_announcement"

class OnlineStatus(enum.Enum):
    """Online presence of the user profile."""
    ONLINE = "online"
    OFFLINE = "offline"
    SNOOZED = "snoozed"       # Account is temporarily hidden from card stacks

class ReportReason(enum.Enum):
    """Reason for reporting a profile."""
    SPAM = "spam"
    FAKE_PROFILE = "fake_profile"
    HARASSMENT = "harassment"
    INAPPROPRIATE_CONTENT = "inappropriate_content"
    UNDERAGE = "underage"
    OTHER = "other"

class ReportStatus(enum.Enum):
    """State of a submitted user report."""
    PENDING = "pending"
    UNDER_REVIEW = "under_review"
    RESOLVED_NO_ACTION = "resolved_no_action"
    RESOLVED_USER_BANNED = "resolved_user_banned"

class SubscriptionTier(enum.Enum):
    """Monetization subscription levels."""
    FREE = "free"
    GOLD = "gold"
    PLATINUM = "platinum"

class PaymentStatus(enum.Enum):
    """Transaction states for premium features."""
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"
