"""Vision calls that return JSON, using Claude or OpenAI (whichever is configured)."""
import base64, io, json, logging, re

from PIL import Image

import config

log = logging.getLogger("fabricnow")


def to_jpeg(data: bytes, max_edge: int = 1568, quality: int = 90) -> bytes:
    """Re-encode for vision input: keeps requests small and under Claude's 5 MB image limit."""
    im = Image.open(io.BytesIO(data))
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        bg = Image.new("RGB", im.size, "white")
        bg.paste(im, mask=im.split()[-1])
        im = bg
    im = im.convert("RGB")
    im.thumbnail((max_edge, max_edge))
    b = io.BytesIO()
    im.save(b, "JPEG", quality=quality)
    return b.getvalue()


def parse_json(text: str) -> dict:
    """Pull the first JSON object out of a model reply, tolerating code fences and chatter."""
    t = (text or "").strip()
    t = re.sub(r"^```(?:json)?\s*|\s*```$", "", t, flags=re.I)
    try:
        return json.loads(t)
    except ValueError:
        pass
    start = t.find("{")
    while start != -1:
        depth = 0
        in_str = esc = False
        for i in range(start, len(t)):
            ch = t[i]
            if in_str:
                if esc: esc = False
                elif ch == "\\": esc = True
                elif ch == '"': in_str = False
                continue
            if ch == '"': in_str = True
            elif ch == "{": depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    try:
                        return json.loads(t[start:i + 1])
                    except ValueError:
                        break
        start = t.find("{", start + 1)
    raise ValueError("The vision model did not return valid JSON.")


def _claude(prompt: str, images: list[bytes], max_tokens: int) -> str:
    content = [{"type": "image", "source": {"type": "base64", "media_type": "image/jpeg",
                                            "data": base64.b64encode(to_jpeg(b)).decode()}} for b in images]
    content.append({"type": "text", "text": prompt + "\n\nReply with a single JSON object and nothing else."})
    r = config.anthropic_client().messages.create(
        model=config.ANTHROPIC_VISION_MODEL, max_tokens=max_tokens,
        messages=[{"role": "user", "content": content}])
    return "".join(b.text for b in r.content if getattr(b, "type", "") == "text")


def _openai(prompt: str, images: list[bytes], max_tokens: int) -> str:
    content = [{"type": "text", "text": prompt}]
    for b in images:
        url = "data:image/jpeg;base64," + base64.b64encode(to_jpeg(b)).decode()
        content.append({"type": "image_url", "image_url": {"url": url, "detail": "high"}})
    r = config.openai_client().chat.completions.create(
        model=config.OPENAI_VISION_MODEL, response_format={"type": "json_object"},
        messages=[{"role": "user", "content": content}])
    return r.choices[0].message.content


def providers() -> list[str]:
    """Configured providers, preferred one first."""
    order = ["anthropic", "openai"] if config.VISION_PROVIDER != "openai" else ["openai", "anthropic"]
    ok = {"anthropic": config.has_anthropic(), "openai": config.has_openai()}
    return [p for p in order if ok[p]]


def vision_json(prompt: str, images: list[bytes], max_tokens: int = 3000) -> tuple[dict, str]:
    """Returns (parsed_json, provider_used). Falls back to the other provider on any non-auth failure."""
    names = providers()
    if not names:
        raise ValueError("Neither ANTHROPIC_API_KEY nor OPENAI_API_KEY is configured on the worker.")
    last = None
    for name in names:
        try:
            text = (_claude if name == "anthropic" else _openai)(prompt, images, max_tokens)
            return parse_json(text), name
        except Exception as e:  # noqa: BLE001 - we deliberately try the next provider
            log.warning("vision provider %s failed: %s", name, e)
            last = e
    raise last
