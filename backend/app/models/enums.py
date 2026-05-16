from enum import Enum


class UserRole(str, Enum):
    STUDENT = "student"
    CREATOR = "creator"
    TEACHER = "teacher"
    ADMIN = "admin"


class TutorMode(str, Enum):
    STANDARD = "standard"
    SIMPLE = "simple"
    MEME = "meme"


class PostType(str, Enum):
    MEME = "meme"
    VIDEO = "video"
