from __future__ import annotations

# pyright: reportMissingImports=false, reportMissingTypeStubs=false

import argparse
import json
import os
import time
from pathlib import Path
from typing import Any, Literal

import requests  # type: ignore[import-untyped]
from pydantic import BaseModel, Field, HttpUrl, ValidationError  # type: ignore[import-not-found]

try:
    from dotenv import load_dotenv  # type: ignore[import-not-found]
except ImportError:  # pragma: no cover - dependency is installed in normal runs
    def load_dotenv() -> None:
        return None


Provider = Literal["facebook", "instagram"]


class SocialMedia(BaseModel):
    type: Literal["image", "video"]
    url: str
    alt: str


class SocialFeedRecord(BaseModel):
    id: str
    provider: Provider
    providerPostId: str
    accountName: str
    url: HttpUrl
    publishedAt: str
    title: str
    caption: str
    media: list[SocialMedia] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    metrics: dict[str, int] | None = None


class SocialLibraryRecord(BaseModel):
    id: str
    provider: Provider
    providerPostId: str
    sourceUrl: HttpUrl
    publishedAt: str
    title: str
    caption: str
    kind: Literal["photo", "video"]
    url: str
    alt: str
    tags: list[str] = Field(default_factory=list)
    source: str = "generated-social"


class GeneratedPayload(BaseModel):
    feed: list[SocialFeedRecord]
    library: list[SocialLibraryRecord]


def parse_int_env(name: str, default: int) -> int:
    raw_value = os.getenv(name)
    if raw_value is None:
        return default

    normalized = raw_value.strip()
    if not normalized:
        return default

    try:
        parsed = int(normalized)
    except ValueError as error:
        raise RuntimeError(f"Environment variable {name} must be an integer when set.") from error

    return parsed


def build_dummy_payload() -> GeneratedPayload:
    return GeneratedPayload(
        feed=[
            SocialFeedRecord(
                id="instagram_dummy_annadaan",
                provider="instagram",
                providerPostId="dummy_annadaan",
                accountName=os.getenv("INSTAGRAM_ACCOUNT_NAME", "@brajjancare"),
                url="https://www.instagram.com/brajjancare/",
                publishedAt="2026-05-04T02:17:00Z",
                title="Serving the Braj Community",
                caption="Dummy social data is active because no social provider credentials were configured for this build.",
                media=[
                    SocialMedia(
                        type="image",
                        url="/images/site/media-food.svg",
                        alt="Volunteers distributing meals in Vrindavan.",
                    )
                ],
                tags=["dummy", "annadaan", "seva"],
                metrics={"likes": 124, "shares": 18},
            ),
            SocialFeedRecord(
                id="facebook_dummy_literacy",
                provider="facebook",
                providerPostId="dummy_literacy",
                accountName=os.getenv("FACEBOOK_ACCOUNT_NAME", "Braj Jan Care Foundation"),
                url="https://www.facebook.com/brajjancare/",
                publishedAt="2026-05-03T11:00:00Z",
                title="Village Learning Circle Begins",
                caption="This generated fallback keeps the static build healthy when live social tokens are unavailable.",
                media=[],
                tags=["dummy", "education", "community"],
                metrics={"likes": 86, "shares": 12},
            ),
            SocialFeedRecord(
                id="instagram_dummy_heritage",
                provider="instagram",
                providerPostId="dummy_heritage",
                accountName=os.getenv("INSTAGRAM_ACCOUNT_NAME", "@brajjancare"),
                url="https://www.instagram.com/brajjancare/",
                publishedAt="2026-05-02T06:45:00Z",
                title="Heritage In Every Stone",
                caption="Prototype-friendly fallback media keeps the gallery and social pages renderable in local and CI builds.",
                media=[
                    SocialMedia(
                        type="image",
                        url="/images/site/media-temple.svg",
                        alt="Temple stonework in Vrindavan.",
                    )
                ],
                tags=["dummy", "heritage", "vrindavan"],
                metrics={"likes": 143, "shares": 21},
            ),
        ],
        library=[
            SocialLibraryRecord(
                id="instagram_dummy_annadaan_media_1",
                provider="instagram",
                providerPostId="dummy_annadaan",
                sourceUrl="https://www.instagram.com/brajjancare/",
                publishedAt="2026-05-04T02:17:00Z",
                title="Food Distribution Drive",
                caption="Community meal service near the Yamuna ghats.",
                kind="photo",
                url="/images/site/media-food.svg",
                alt="Volunteers distributing meals in Vrindavan.",
                tags=["dummy", "annadaan", "seva"],
            ),
            SocialLibraryRecord(
                id="instagram_dummy_heritage_media_1",
                provider="instagram",
                providerPostId="dummy_heritage",
                sourceUrl="https://www.instagram.com/brajjancare/",
                publishedAt="2026-05-02T06:45:00Z",
                title="Temple Stonework",
                caption="Heritage details from Vrindavan lanes.",
                kind="photo",
                url="/images/site/media-temple.svg",
                alt="Temple stonework in Vrindavan.",
                tags=["dummy", "heritage", "vrindavan"],
            ),
        ],
    )


def request_json(url: str, params: dict[str, Any], provider: Provider, operation: str) -> dict[str, Any]:
    for attempt in range(1, 4):
        response = requests.get(url, params=params, timeout=30)
        if response.status_code in {429, 500, 502, 503, 504} and attempt < 3:
            time.sleep(2 * attempt)
            continue
        if response.status_code >= 400:
            raise RuntimeError(f"{provider} {operation} failed with HTTP {response.status_code}.")
        return response.json()
    raise RuntimeError(f"{provider} {operation} failed after retries.")


def fetch_instagram(limit: int) -> list[dict[str, Any]]:
    access_token = os.getenv("INSTAGRAM_ACCESS_TOKEN")
    user_id = os.getenv("INSTAGRAM_USER_ID", "me")
    if not access_token:
        return []

    url = f"https://graph.instagram.com/{user_id}/media"
    params = {
        "fields": "id,caption,media_type,media_url,permalink,timestamp,thumbnail_url",
        "limit": min(limit, 50),
        "access_token": access_token,
    }
    records: list[dict[str, Any]] = []

    while url and len(records) < limit:
        payload = request_json(url, params, "instagram", "media fetch")
        records.extend(payload.get("data", []))
        url = payload.get("paging", {}).get("next")
        params = {}

    return records[:limit]


def fetch_facebook(limit: int) -> list[dict[str, Any]]:
    access_token = os.getenv("FACEBOOK_ACCESS_TOKEN")
    page_id = os.getenv("FACEBOOK_PAGE_ID")
    if not access_token or not page_id:
        return []

    url = f"https://graph.facebook.com/v19.0/{page_id}/posts"
    params = {
        "fields": "id,message,created_time,permalink_url,attachments{media_type,media,url,title,description,subattachments}",
        "limit": min(limit, 50),
        "access_token": access_token,
    }
    records: list[dict[str, Any]] = []

    while url and len(records) < limit:
        payload = request_json(url, params, "facebook", "posts fetch")
        records.extend(payload.get("data", []))
        url = payload.get("paging", {}).get("next")
        params = {}

    return records[:limit]


def title_from_caption(caption: str, fallback: str) -> str:
    clean_caption = " ".join(caption.split())
    if not clean_caption:
        return fallback
    return clean_caption[:72].rstrip(" .,;:")


def normalize_instagram(records: list[dict[str, Any]]) -> GeneratedPayload:
    feed: list[SocialFeedRecord] = []
    library: list[SocialLibraryRecord] = []

    for record in records:
        media_type = str(record.get("media_type", "IMAGE")).lower()
        kind = "video" if media_type == "video" else "photo"
        media_url = record.get("thumbnail_url") if kind == "video" else record.get("media_url")
        caption = record.get("caption") or "Instagram update from Braj Jan Care Foundation."
        permalink = record.get("permalink") or "https://www.instagram.com/brajjancare/"
        provider_post_id = str(record.get("id"))
        title = title_from_caption(caption, "Instagram Seva Update")
        media = []
        if media_url:
            media.append(SocialMedia(type="video" if kind == "video" else "image", url=media_url, alt=title))

        feed.append(
            SocialFeedRecord(
                id=f"instagram_{provider_post_id}",
                provider="instagram",
                providerPostId=provider_post_id,
                accountName=os.getenv("INSTAGRAM_ACCOUNT_NAME", "@brajjancare"),
                url=permalink,
                publishedAt=record.get("timestamp"),
                title=title,
                caption=caption,
                media=media,
                tags=["instagram", "seva"],
            )
        )

        if media_url:
            library.append(
                SocialLibraryRecord(
                    id=f"instagram_{provider_post_id}_media_1",
                    provider="instagram",
                    providerPostId=provider_post_id,
                    sourceUrl=permalink,
                    publishedAt=record.get("timestamp"),
                    title=title,
                    caption=caption,
                    kind=kind,
                    url=media_url,
                    alt=title,
                    tags=["instagram", "seva"],
                )
            )

    return GeneratedPayload(feed=feed, library=library)


def flatten_facebook_attachments(record: dict[str, Any]) -> list[dict[str, Any]]:
    attachments = record.get("attachments", {}).get("data", [])
    flattened: list[dict[str, Any]] = []
    for attachment in attachments:
        subattachments = attachment.get("subattachments", {}).get("data")
        if subattachments:
            flattened.extend(subattachments)
        else:
            flattened.append(attachment)
    return flattened


def normalize_facebook(records: list[dict[str, Any]]) -> GeneratedPayload:
    feed: list[SocialFeedRecord] = []
    library: list[SocialLibraryRecord] = []

    for record in records:
        provider_post_id = str(record.get("id"))
        caption = record.get("message") or "Facebook update from Braj Jan Care Foundation."
        permalink = record.get("permalink_url") or "https://www.facebook.com/brajjancare/"
        published_at = record.get("created_time")
        title = title_from_caption(caption, "Facebook Seva Update")
        media_items: list[SocialMedia] = []

        for index, attachment in enumerate(flatten_facebook_attachments(record), start=1):
            media_url = attachment.get("media", {}).get("image", {}).get("src") or attachment.get("url")
            if not media_url:
                continue
            media_type = str(attachment.get("media_type", "photo")).lower()
            kind = "video" if "video" in media_type else "photo"
            media_items.append(SocialMedia(type="video" if kind == "video" else "image", url=media_url, alt=title))
            library.append(
                SocialLibraryRecord(
                    id=f"facebook_{provider_post_id}_media_{index}",
                    provider="facebook",
                    providerPostId=provider_post_id,
                    sourceUrl=permalink,
                    publishedAt=published_at,
                    title=title,
                    caption=caption,
                    kind=kind,
                    url=media_url,
                    alt=title,
                    tags=["facebook", "seva"],
                )
            )

        feed.append(
            SocialFeedRecord(
                id=f"facebook_{provider_post_id}",
                provider="facebook",
                providerPostId=provider_post_id,
                accountName=os.getenv("FACEBOOK_ACCOUNT_NAME", "Braj Jan Care Foundation"),
                url=permalink,
                publishedAt=published_at,
                title=title,
                caption=caption,
                media=media_items,
                tags=["facebook", "seva"],
            )
        )

    return GeneratedPayload(feed=feed, library=library)


def merge_payloads(payloads: list[GeneratedPayload]) -> GeneratedPayload:
    feed = [record for payload in payloads for record in payload.feed]
    library = [record for payload in payloads for record in payload.library]
    feed.sort(key=lambda record: record.publishedAt, reverse=True)
    library.sort(key=lambda record: record.publishedAt, reverse=True)
    return GeneratedPayload(feed=feed, library=library)


def load_existing(output: Path) -> GeneratedPayload:
    feed_path = output / "social-feed.json"
    library_path = output / "social-library.json"
    if not feed_path.exists() or not library_path.exists():
        raise RuntimeError("Missing generated social JSON and no provider credentials were configured.")

    return GeneratedPayload(
        feed=[SocialFeedRecord.model_validate(item) for item in json.loads(feed_path.read_text(encoding="utf-8"))],
        library=[SocialLibraryRecord.model_validate(item) for item in json.loads(library_path.read_text(encoding="utf-8"))],
    )


def write_payload(output: Path, payload: GeneratedPayload) -> None:
    output.mkdir(parents=True, exist_ok=True)
    (output / "social-feed.json").write_text(
        json.dumps([record.model_dump(mode="json") for record in payload.feed], indent=2) + "\n",
        encoding="utf-8",
    )
    (output / "social-library.json").write_text(
        json.dumps([record.model_dump(mode="json") for record in payload.library], indent=2) + "\n",
        encoding="utf-8",
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Fetch public social media records into normalized static JSON.")
    parser.add_argument("--output", default="data/generated", help="Generated JSON output directory.")
    parser.add_argument("--provider", choices=["all", "facebook", "instagram"], default="all")
    parser.add_argument("--limit", type=int, default=parse_int_env("SOCIAL_FETCH_LIMIT", 50))
    parser.add_argument("--dry-run", action="store_true", help="Fetch and validate without writing output files.")
    parser.add_argument(
        "--use-existing-on-missing-credentials",
        action="store_true",
        help="Keep the build healthy when provider credentials are not configured.",
    )
    return parser.parse_args()


def main() -> None:
    load_dotenv()
    args = parse_args()
    output = Path(args.output)
    payloads: list[GeneratedPayload] = []

    instagram_enabled = args.provider in {"all", "instagram"} and os.getenv("INSTAGRAM_ACCESS_TOKEN")
    facebook_enabled = args.provider in {"all", "facebook"} and os.getenv("FACEBOOK_ACCESS_TOKEN") and os.getenv("FACEBOOK_PAGE_ID")

    if instagram_enabled:
        payloads.append(normalize_instagram(fetch_instagram(args.limit)))
    if facebook_enabled:
        payloads.append(normalize_facebook(fetch_facebook(args.limit)))

    if not payloads:
        payload = build_dummy_payload()

        if args.dry_run:
            print(
                f"No social credentials configured; dummy fallback prepared with {len(payload.feed)} feed records and {len(payload.library)} media records."
            )
            return

        write_payload(output, payload)

        if args.use_existing_on_missing_credentials:
            print(
                f"No social credentials configured; wrote dummy social JSON with {len(payload.feed)} feed records and {len(payload.library)} media records."
            )
            return

        print(
            f"No social credentials configured; wrote dummy social JSON with {len(payload.feed)} feed records and {len(payload.library)} media records."
        )
        return

    payload = merge_payloads(payloads)

    if args.dry_run:
        print(f"Dry run succeeded with {len(payload.feed)} feed records and {len(payload.library)} media records.")
        return

    write_payload(output, payload)
    print(f"Wrote {len(payload.feed)} feed records and {len(payload.library)} media records to {output}.")


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, ValidationError, requests.RequestException) as error:
        raise SystemExit(str(error)) from error