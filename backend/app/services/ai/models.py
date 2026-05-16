from pydantic import BaseModel, Field


class MemeResult(BaseModel):
    image_url: str
    prompt: str
    model: str
    top_text: str = ""
    bottom_text: str = ""
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


class PresentationSlide(BaseModel):
    title: str
    bullets: list[str] = Field(default_factory=list)
    speaker_notes: str = ""


class PresentationResult(BaseModel):
    title: str
    font_style: str
    slides: list[PresentationSlide]
    model: str
    source: str = "llm"  # llm | template


class FalJobMeta(BaseModel):
    request_id: str | None = None
    model: str
