#!/usr/bin/env python3
# Upload the release AAB and mark that versionCode completed on a Play track.
# Usage: play_upload.py [track]
# The track argument is optional. When omitted, the release goes to internal.
import re
import sys
from pathlib import Path

PACKAGE = "ai.kidsit.app"
SERVICE_ACCOUNT = "kidsit-play-2c205e0ff50d.json"
DEFAULT_TRACK = "internal"
AAB_PATH = Path("android/app/build/outputs/bundle/release/app-release.aab")
PLAY_NOTE_LIMIT = 500
# he-IL first: that is the store's primary listing language.
PLAY_LOCALES = ("he-IL", "en-US")
NOTES_DIR = Path("release-notes/play")


def utf16_units(text):
    # Play counts UTF-16 code units, same as the character counts in docs/release-notes-*.md.
    return len(text.encode("utf-16-le")) // 2


def load_play_notes(notes_dir=NOTES_DIR):
    notes = []
    for language in PLAY_LOCALES:
        path = notes_dir / f"{language}.txt"
        if not path.is_file():
            raise SystemExit(f"missing Play release notes: {path}")
        text = path.read_text(encoding="utf-8").strip()
        if not text:
            raise SystemExit(f"empty Play release notes: {path}")
        count = utf16_units(text)
        if count > PLAY_NOTE_LIMIT:
            raise SystemExit(
                f"{path} is {count} characters; Play allows {PLAY_NOTE_LIMIT} per language"
            )
        notes.append({"language": language, "text": text})
    return notes


def gradle_version_code(gradle_path=Path("android/app/build.gradle")):
    match = re.search(r"versionCode\s+(\d+)", gradle_path.read_text(encoding="utf-8"))
    if not match:
        raise SystemExit(f"versionCode not found in {gradle_path}")
    return int(match.group(1))


def release_body(version_code, notes):
    # versionCodes + status completed, plus the notes for he-IL and en-US.
    return {
        "releases": [{
            "versionCodes": [str(version_code)],
            "status": "completed",
            "releaseNotes": notes,
        }]
    }


def track_from_argv(argv):
    if len(argv) > 2:
        raise SystemExit("Usage: play_upload.py [track]")
    return argv[1] if len(argv) == 2 else DEFAULT_TRACK


def main(argv):
    track = track_from_argv(argv)
    notes = load_play_notes()
    expected = gradle_version_code()
    if not AAB_PATH.is_file():
        raise SystemExit(f"missing release bundle: {AAB_PATH}")

    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload
    from google.oauth2 import service_account

    creds = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT, scopes=["https://www.googleapis.com/auth/androidpublisher"]
    )
    svc = build("androidpublisher", "v3", credentials=creds)
    edits = svc.edits()
    edit_id = edits.insert(packageName=PACKAGE, body={}).execute()["id"]

    bundle = edits.bundles().upload(
        packageName=PACKAGE,
        editId=edit_id,
        media_body=MediaFileUpload(str(AAB_PATH), mimetype="application/octet-stream", resumable=True),
    ).execute()
    version_code = int(bundle["versionCode"])
    if version_code != expected:
        raise SystemExit(
            f"uploaded versionCode {version_code} does not match gradle versionCode {expected}; edit not committed"
        )
    print(f"uploaded versionCode {version_code}")

    edits.tracks().update(
        packageName=PACKAGE,
        editId=edit_id,
        track=track,
        body=release_body(version_code, notes),
    ).execute()
    print(f"set {track} to versionCode {version_code} with {len(notes)} release notes")

    edits.commit(packageName=PACKAGE, editId=edit_id).execute()
    print("committed")


if __name__ == "__main__":
    main(sys.argv)
