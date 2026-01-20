#!/bin/bash
# create-worktree.sh - Create a git worktree for a task
#
# Usage: ./create-worktree.sh <repo-path> <task-id> [base-branch]
#
# Examples:
#   ./create-worktree.sh ~/Projects/backend JIRA-123
#   ./create-worktree.sh ~/Projects/backend JIRA-123 main
#   ./create-worktree.sh /path/to/repo feature/new-api develop

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
WORKTREE_DIR=".worktrees"

# Functions
error() {
    echo -e "${RED}Error: $1${NC}" >&2
    exit 1
}

info() {
    echo -e "${BLUE}$1${NC}"
}

success() {
    echo -e "${GREEN}$1${NC}"
}

warn() {
    echo -e "${YELLOW}$1${NC}"
}

usage() {
    echo "Usage: $0 <repo-path> <task-id> [base-branch]"
    echo ""
    echo "Arguments:"
    echo "  repo-path    Path to the git repository"
    echo "  task-id      Task ID or branch name (e.g., JIRA-123, feature/new-api)"
    echo "  base-branch  Base branch to create from (default: main)"
    echo ""
    echo "Examples:"
    echo "  $0 ~/Projects/backend JIRA-123"
    echo "  $0 ~/Projects/backend JIRA-123 develop"
    echo "  $0 /path/to/repo feature/new-api main"
    exit 1
}

# Parse arguments
if [ -z "$1" ] || [ -z "$2" ]; then
    usage
fi

REPO_PATH="$1"
TASK_ID="$2"
BASE_BRANCH="${3:-main}"

# Expand ~ in path
REPO_PATH="${REPO_PATH/#\~/$HOME}"

# Validate repo path exists
if [ ! -d "$REPO_PATH" ]; then
    error "Repository path does not exist: $REPO_PATH"
fi

# Change to repo directory
cd "$REPO_PATH"

# Validate it's a git repository
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    error "Not a git repository: $REPO_PATH"
fi

# Get repository root (in case user passed a subdirectory)
REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"

# Sanitize task ID for directory name (replace / with -)
SAFE_TASK_ID=$(echo "$TASK_ID" | sed 's/\//-/g')

# Determine branch name (prefix with task/ if it doesn't have a prefix)
if [[ "$TASK_ID" == *"/"* ]]; then
    BRANCH_NAME="$TASK_ID"
else
    BRANCH_NAME="task/$TASK_ID"
fi

WORKTREE_PATH="$WORKTREE_DIR/$SAFE_TASK_ID"

info "Creating worktree for task: $TASK_ID"
echo "  Branch: $BRANCH_NAME"
echo "  Base: $BASE_BRANCH"
echo "  Path: $WORKTREE_PATH"
echo ""

# Ensure .worktrees directory exists
mkdir -p "$WORKTREE_DIR"

# Add .worktrees to .gitignore if not already there
if [ -f .gitignore ]; then
    if ! grep -q "^\.worktrees/?$" .gitignore 2>/dev/null; then
        warn "Adding .worktrees/ to .gitignore"
        echo ".worktrees/" >> .gitignore
    fi
else
    warn "Creating .gitignore with .worktrees/"
    echo ".worktrees/" > .gitignore
fi

# Check if worktree already exists
if [ -d "$WORKTREE_PATH" ]; then
    error "Worktree already exists at $WORKTREE_PATH. Remove it first with: git worktree remove $WORKTREE_PATH"
fi

# Fetch latest from remote
info "Fetching latest from remote..."
git fetch origin "$BASE_BRANCH" 2>/dev/null || warn "Could not fetch $BASE_BRANCH from origin (continuing anyway)"

# Check if base branch exists
if ! git rev-parse --verify "$BASE_BRANCH" > /dev/null 2>&1; then
    if ! git rev-parse --verify "origin/$BASE_BRANCH" > /dev/null 2>&1; then
        error "Base branch '$BASE_BRANCH' does not exist locally or on remote"
    fi
    # Use remote branch as base
    BASE_REF="origin/$BASE_BRANCH"
else
    BASE_REF="$BASE_BRANCH"
fi

# Check if branch already exists
if git rev-parse --verify "$BRANCH_NAME" > /dev/null 2>&1; then
    warn "Branch '$BRANCH_NAME' already exists, creating worktree with existing branch"
    git worktree add "$WORKTREE_PATH" "$BRANCH_NAME"
else
    info "Creating new branch '$BRANCH_NAME' from '$BASE_REF'"
    git worktree add -b "$BRANCH_NAME" "$WORKTREE_PATH" "$BASE_REF"
fi

success ""
success "Worktree created successfully!"
echo ""
echo "Location: $REPO_ROOT/$WORKTREE_PATH"
echo ""
echo "Quick commands:"
echo "  cd $WORKTREE_PATH           # Enter worktree"
echo "  code $WORKTREE_PATH         # Open in VS Code"
echo ""
echo "When done:"
echo "  git worktree remove $WORKTREE_PATH"
