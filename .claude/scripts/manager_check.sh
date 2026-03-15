#!/bin/bash
# Manager Message Auto-Check Hook (셰프용)
# 셰프가 프롬프트를 입력할 때마다 지배인의 새 메시지를 자동 감지

CHEF_MSG="/c/orgcell/chef_message.txt"
STATE_FILE="/c/orgcell/.claude/scripts/.manager_hash"

if [ ! -f "$CHEF_MSG" ]; then
    exit 0
fi

CURRENT_HASH=$(md5sum "$CHEF_MSG" 2>/dev/null | cut -d' ' -f1)
PREV_HASH=""

if [ -f "$STATE_FILE" ]; then
    PREV_HASH=$(cat "$STATE_FILE")
fi

if [ "$CURRENT_HASH" != "$PREV_HASH" ]; then
    LATEST=$(awk '/^========/{count++} count==2{exit} {print}' "$CHEF_MSG")

    if echo "$LATEST" | grep -q "지배인 →"; then
        echo "[MANAGER_NEW_MESSAGE] chef_message.txt에 지배인의 새 메시지가 있습니다:"
        echo "---"
        echo "$LATEST"
        echo "---"
    fi

    echo "$CURRENT_HASH" > "$STATE_FILE"
fi
