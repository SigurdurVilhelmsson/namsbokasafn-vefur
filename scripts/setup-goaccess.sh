#!/bin/bash
# GoAccess Setup and Report Generator for Námsbókasafn
#
# GoAccess analyzes nginx access logs and produces HTML reports
# with visitor stats, pages, referrers, browsers, and more.
#
# SETUP (run once on Linode server):
#   chmod +x scripts/setup-goaccess.sh
#   sudo ./scripts/setup-goaccess.sh install
#
# USAGE:
#   sudo ./scripts/setup-goaccess.sh report          # Generate HTML report
#   sudo ./scripts/setup-goaccess.sh report 30        # Last 30 days only
#   sudo ./scripts/setup-goaccess.sh live             # Real-time terminal dashboard
#
# REPORTS:
#   Reports are saved to /var/www/namsbokasafn-vefur/build/traffic-report.html
#   View at: https://namsbokasafn.is/traffic-report.html
#   (Protected by nginx location block — see nginx config)

set -euo pipefail

# Configuration
LOG_DIR="/var/log/nginx"
LOG_FILE="$LOG_DIR/namsbokasafn.access.log"
REPORT_DIR="/var/www/namsbokasafn-vefur/build"
REPORT_FILE="$REPORT_DIR/traffic-report.html"
GOACCESS_CONF="/etc/goaccess/goaccess.conf"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Check root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        error "Please run with sudo: sudo $0 $*"
    fi
}

# Install GoAccess
install() {
    check_root
    info "Installing GoAccess..."

    # Add GoAccess official repo for latest version
    if ! command -v goaccess &> /dev/null; then
        apt-get update
        apt-get install -y goaccess
        info "GoAccess installed successfully: $(goaccess --version | head -1)"
    else
        info "GoAccess already installed: $(goaccess --version | head -1)"
    fi

    # Ensure report directory exists
    mkdir -p "$REPORT_DIR"

    info "Setup complete!"
    info ""
    info "Next steps:"
    info "  1. Sign up at https://www.goatcounter.com (for real-time web analytics)"
    info "  2. Generate a report: sudo $0 report"
    info "  3. View report at: https://namsbokasafn.is/traffic-report.html"
    info "     (Make sure the nginx location block is in place — see nginx config)"
}

# Find log files, optionally filtering by date range
find_logs() {
    local days="${1:-0}"
    local logs=""

    # Current log
    if [ -f "$LOG_FILE" ]; then
        logs="$LOG_FILE"
    fi

    # Also check for rotated logs (logrotate creates .1, .2.gz, etc.)
    for rotated in "$LOG_FILE".1 "$LOG_FILE".*.gz; do
        if [ -f "$rotated" ]; then
            logs="$logs $rotated"
        fi
    done

    # Fallback: try common alternative log names
    if [ -z "$logs" ]; then
        for alt in "$LOG_DIR/namsbokasafn.is.access.log" \
                   "$LOG_DIR/namsbokasafn-vefur.access.log" \
                   "$LOG_DIR/access.log"; do
            if [ -f "$alt" ]; then
                warn "Using alternative log: $alt"
                warn "Update LOG_FILE in this script to match your actual log path."
                logs="$alt"
                break
            fi
        done
    fi

    if [ -z "$logs" ]; then
        error "No access logs found in $LOG_DIR. Check your nginx log configuration."
    fi

    echo "$logs"
}

# Generate HTML report
generate_report() {
    check_root
    local days="${1:-0}"

    info "Generating traffic report..."

    local logs
    logs=$(find_logs "$days")

    local date_filter=""
    if [ "$days" -gt 0 ] 2>/dev/null; then
        # GoAccess --keep-last flag filters by number of days
        date_filter="--keep-last=$days"
        info "Filtering to last $days days"
    fi

    # Build the goaccess command
    # COMBINED log format covers most nginx default configs
    local cmd="goaccess"
    cmd="$cmd --log-format=COMBINED"
    cmd="$cmd --output=$REPORT_FILE"
    cmd="$cmd --html-report-title='Námsbókasafn - Umferðarskýrsla'"
    cmd="$cmd --ignore-crawlers"
    cmd="$cmd --anonymize-ip"
    cmd="$cmd --exclude-ip=127.0.0.1"
    cmd="$cmd --real-os"
    cmd="$cmd --double-decode"

    if [ -n "$date_filter" ]; then
        cmd="$cmd $date_filter"
    fi

    # Handle both plain and gzipped logs
    local plain_logs=""
    local gz_logs=""
    for log in $logs; do
        if [[ "$log" == *.gz ]]; then
            gz_logs="$gz_logs $log"
        else
            plain_logs="$plain_logs $log"
        fi
    done

    # Process logs (pipe gzipped through zcat)
    if [ -n "$gz_logs" ] && [ -n "$plain_logs" ]; then
        (zcat $gz_logs 2>/dev/null; cat $plain_logs) | $cmd -
    elif [ -n "$gz_logs" ]; then
        zcat $gz_logs | $cmd -
    else
        $cmd $plain_logs
    fi

    # Set permissions so nginx can serve it
    chmod 644 "$REPORT_FILE"

    info "Report generated: $REPORT_FILE"
    info "View at: https://namsbokasafn.is/traffic-report.html"
}

# Real-time terminal dashboard
live_dashboard() {
    check_root
    local logs
    logs=$(find_logs)

    # Use only the current (non-rotated) log for live view
    local current_log="$LOG_FILE"
    if [ ! -f "$current_log" ]; then
        # Fallback to first found log
        current_log=$(echo "$logs" | awk '{print $1}')
    fi

    info "Starting live dashboard (press q to quit)..."
    tail -f "$current_log" | goaccess \
        --log-format=COMBINED \
        --real-os \
        --ignore-crawlers \
        --anonymize-ip \
        --exclude-ip=127.0.0.1 \
        -
}

# Main
case "${1:-help}" in
    install)
        install
        ;;
    report)
        generate_report "${2:-0}"
        ;;
    live)
        live_dashboard
        ;;
    help|--help|-h)
        echo "Usage: sudo $0 {install|report [days]|live}"
        echo ""
        echo "Commands:"
        echo "  install       Install GoAccess and set up directories"
        echo "  report        Generate HTML report (optionally: report 30 for last 30 days)"
        echo "  live          Real-time terminal dashboard"
        echo ""
        echo "Examples:"
        echo "  sudo $0 install        # First-time setup"
        echo "  sudo $0 report         # Full HTML report"
        echo "  sudo $0 report 7       # Last 7 days"
        echo "  sudo $0 live           # Live terminal view"
        ;;
    *)
        error "Unknown command: $1. Use '$0 help' for usage."
        ;;
esac
