# GitHub Issue for anthropics/claude-plugins-official

**Repository:** https://github.com/anthropics/claude-plugins-official/issues/new

---

## Title

ralph-wiggum: /ralph-loop command fails due to multi-line bash script

---

## Body

### Bug Description

The `/ralph-loop` command fails with the error:

```
Error: Bash command permission check failed for pattern "```!...":
Command contains newlines that could separate multiple commands
```

### Root Cause

The file `plugins/ralph-wiggum/commands/ralph-loop.md` contains a multi-line bash script in the executable code block (lines 12-44):

```markdown
```!
"${CLAUDE_PLUGIN_ROOT}/scripts/setup-ralph-loop.sh" $ARGUMENTS

# Extract and display completion promise if set
if [ -f .claude/ralph-loop.local.md ]; then
  PROMISE=$(grep '^completion_promise:' .claude/ralph-loop.local.md | sed 's/completion_promise: *//' | sed 's/^"\(.*\)"$/\1/')
  if [ -n "$PROMISE" ] && [ "$PROMISE" != "null" ]; then
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    # ... 25+ more lines
  fi
fi
```

However, Claude Code's security model **rejects bash commands containing newlines** to prevent command injection attacks.

The `allowed-tools` header only permits:
```
allowed-tools: ["Bash(${CLAUDE_PLUGIN_ROOT}/scripts/setup-ralph-loop.sh)"]
```

But the actual command is a 40+ line script, not just the permitted single script call.

### Expected Behavior

The `/ralph-loop` command should execute successfully and set up the Ralph loop.

### Suggested Fix

Either:

1. **Move the promise display logic into `setup-ralph-loop.sh`** - The setup script already outputs setup information, so the promise extraction logic could be added there.

2. **Simplify the command to a single-line call:**
   ```markdown
   ```!
   "${CLAUDE_PLUGIN_ROOT}/scripts/setup-ralph-loop.sh" $ARGUMENTS
   ```

### Environment

- Claude Code CLI
- Plugin version: 6d3752c000e2 (from cache)
- OS: Linux (WSL2)

### Reproduction Steps

1. Install the ralph-wiggum plugin: `/plugin install ralph-wiggum@claude-plugins-official`
2. Run: `/ralph-loop "Test prompt" --max-iterations 5`
3. Observe the "Command contains newlines" error

### Workaround

Users can manually run the setup script:
```bash
~/.claude/plugins/cache/claude-plugins-official/ralph-wiggum/*/scripts/setup-ralph-loop.sh "prompt" --completion-promise "DONE" --max-iterations 10
```
