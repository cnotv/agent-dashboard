import type { BoardColumn } from '@agent-dashboard/contracts'

export const sampleBoardColumns: BoardColumn[] = [
  {
    "status": "no-pull-request",
    "cards": [
      {
        "issue": {
          "number": 12,
          "title": "Add a camera preset",
          "url": "https://github.com/cnotv/example/issues/12",
          "updatedAt": "2026-09-27T10:00:00Z",
          "labels": [
            {
              "name": "enhancement",
              "color": "a2eeef"
            }
          ],
          "linkedPullRequestNumbers": []
        },
        "pullRequest": null,
        "status": "no-pull-request"
      }
    ]
  },
  {
    "status": "draft",
    "cards": [
      {
        "issue": null,
        "pullRequest": {
          "number": 31,
          "title": "chore: tidy",
          "url": "https://github.com/cnotv/example/pull/31",
          "isDraft": true,
          "headRefName": "claude/tidy-things",
          "headSha": "fedc9876",
          "reviewDecision": null,
          "mergeable": "UNKNOWN",
          "body": "",
          "updatedAt": "2026-09-25T12:00:00Z",
          "gates": [],
          "gateSummary": {
            "passed": 0,
            "failed": 0,
            "pending": 0,
            "total": 0,
            "overallState": "none"
          }
        },
        "status": "draft"
      }
    ]
  },
  {
    "status": "checks-running",
    "cards": []
  },
  {
    "status": "checks-failing",
    "cards": [
      {
        "issue": {
          "number": 7,
          "title": "Fix marble stickiness",
          "url": "https://github.com/cnotv/example/issues/7",
          "updatedAt": "2026-09-26T10:00:00Z",
          "labels": [],
          "linkedPullRequestNumbers": [
            30
          ]
        },
        "pullRequest": {
          "number": 30,
          "title": "fix: marble stickiness (#7)",
          "url": "https://github.com/cnotv/example/pull/30",
          "isDraft": false,
          "headRefName": "fix/7-marble-stickiness",
          "headSha": "0123abcd",
          "reviewDecision": "REVIEW_REQUIRED",
          "mergeable": "MERGEABLE",
          "body": "Closes #7\n\nPreview route: /games/MarbleMadness",
          "updatedAt": "2026-09-27T12:00:00Z",
          "gates": [
            {
              "name": "lint",
              "state": "success",
              "url": "https://github.com/cnotv/example/runs/1"
            },
            {
              "name": "test",
              "state": "failure",
              "url": "https://github.com/cnotv/example/runs/2"
            },
            {
              "name": "deploy/netlify",
              "state": "pending",
              "url": "https://github.com/cnotv/example/actions"
            }
          ],
          "gateSummary": {
            "passed": 1,
            "failed": 1,
            "pending": 1,
            "total": 3,
            "overallState": "failing"
          }
        },
        "status": "checks-failing"
      }
    ]
  },
  {
    "status": "ready-for-review",
    "cards": []
  },
  {
    "status": "approved",
    "cards": []
  }
]
