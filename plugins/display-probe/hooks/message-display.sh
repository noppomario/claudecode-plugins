#!/usr/bin/env bash
# MessageDisplay probe.
#
# A reply carrying the token is displayed as a numbered battery of rendering
# candidates instead of its own text. Which numbers draw, and which show as
# their own markup, says what the host's renderer accepts: the answer differs
# between the terminal's own drawing and a webview that renders markdown.
#
# Replies without the token are left alone: the hook exits 0 with no output,
# which displays the original.
set -euo pipefail

TOKEN='::display-probe::'

# The event's text is `delta`: the batch of newly completed lines this call
# is being asked about, not the whole message. `index` counts the calls within
# one message and `final` marks the last.
input=$(cat)
text=$(printf '%s' "$input" | jq -r '.delta // ""')

case "$text" in
*"$TOKEN"*) ;;
*) exit 0 ;;
esac

root="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
svg="$root/assets/probe.svg"
data="data:image/svg+xml;base64,$(base64 -w0 "$svg")"

# Fences are written as a variable so this script's own heredoc does not end
# on one, and so a renderer that mangles them is visible as itself.
fence='```'

body=$(
	cat <<EOF
\`[display-probe] the hook reached this surface\`

**1. markdown image, file URL**

![probe 1](file://$svg)

**2. markdown image, data URI**

![probe 2]($data)

**3. html img tag, file URL**

<img src="file://$svg" width="240" height="80" alt="probe 3">

**4. inline svg element**

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 40" width="240" height="40"><rect x="1" y="1" width="238" height="38" rx="6" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/><text x="120" y="26" font-family="sans-serif" font-size="16" fill="#e2e8f0" text-anchor="middle">inline svg</text></svg>

**5. mermaid fence**

${fence}mermaid
graph TD
  A[Parse] --> B[Render]
  B --> C{Drawn?}
${fence}

**6. html details block**

<details><summary>probe 6 summary</summary>

hidden body

</details>

**7. ansi escape in plain text**

$(printf '\033[36m')cyan if ANSI is honoured$(printf '\033[0m')
EOF
)

jq -n --arg content "$body" \
	'{hookSpecificOutput: {hookEventName: "MessageDisplay", displayContent: $content}}'
