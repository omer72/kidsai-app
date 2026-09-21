#!/usr/bin/env python3
# ponytail: promote an already-uploaded versionCode from one track to another.
# Usage: play_promote.py <versionCode> <fromTrack> <toTrack>
import re
import sys
from googleapiclient.discovery import build
from google.oauth2 import service_account

PACKAGE = "ai.kidsit.app"
SERVICE_ACCOUNT = "kidsit-play-2c205e0ff50d.json"

version_code = sys.argv[1]
from_track = sys.argv[2]
to_track = sys.argv[3]
notes = sys.stdin.read().strip() or "Bug fixes and improvements."

# Release name follows the gradle versionName so it never goes stale.
version_name = re.search(
    r'versionName "([^"]+)"', open("android/app/build.gradle").read()
).group(1)

creds = service_account.Credentials.from_service_account_file(
    SERVICE_ACCOUNT, scopes=["https://www.googleapis.com/auth/androidpublisher"]
)
svc = build("androidpublisher", "v3", credentials=creds)
edits = svc.edits()
edit_id = edits.insert(packageName=PACKAGE, body={}).execute()["id"]

# Push the version onto the target track as a completed release.
edits.tracks().update(
    packageName=PACKAGE, editId=edit_id, track=to_track,
    body={
        "releases": [{
            "name": f"{version_name} ({version_code})",
            "versionCodes": [str(version_code)],
            "status": "completed",
            "releaseNotes": [{"language": "en-US", "text": notes}],
        }]
    },
).execute()
print(f"set {to_track} to versionCode {version_code}")

edits.commit(packageName=PACKAGE, editId=edit_id).execute()
print("committed")
