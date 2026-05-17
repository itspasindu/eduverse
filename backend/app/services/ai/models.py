from pydantic import BaseModel, Field


class MemeResult(BaseModel):
    image_url: str
    prompt: str
    model: str
    top_text: str = ""
    bottom_text: str = ""
    feed_caption: str = ""
    post_caption: str = ""
    caption_source: str = "overlay"  # overlay | baked-in (legacy)


class VideoResult(BaseModel):
    video_url: str
    source_image: str
    model: str


class TutorResult(BaseModel):
    answer: str
    question: str
    model: str
    mode: str = "standard"
    context_used: bool = False
    steps: list[dict] = Field(default_factory=list)


class AgentStepModel(BaseModel):
    step_type: str
    tool_name: str | None = None
    input: dict | None = None
    output: str | None = None


class AgentChatResult(BaseModel):
    answer: str
    message: str
    model: str
    mode: str = "standard"
    steps: list[AgentStepModel] = Field(default_factory=list)
    character_id: str | None = None
    context_used: bool = False


class LessonScene(BaseModel):
    title: str
    narration: str
    visual_prompt: str
    on_screen_text: str = ""
    image_url: str | None = None
    audio_url: str | None = None
    video_url: str | None = None


class LessonVideoResult(BaseModel):
    job_id: str
    status: str
    progress: int = 0
    title: str = ""
    phase: str | None = None
    scenes: list[LessonScene] = Field(default_factory=list)
    playlist_url: str | None = None
    cover_image_url: str | None = None
    video_mode: str | None = None  # animated | still | none
    error: str | None = None


class PresentationSlide(BaseModel):
    title: str
    bullets: list[str] = Field(default_factory=list)
    speaker_notes: str = ""
    image_url: str | None = None


class PresentationResult(BaseModel):
    title: str
    font_style: str
    slides: list[PresentationSlide]
    model: str
    source: str = "llm"  # llm | template


class FalJobMeta(BaseModel):
    request_id: str | None = None
    model: str
