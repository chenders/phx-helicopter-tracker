#!/usr/bin/env python3
"""
Log cleanup script to manage log retention
Removes log files older than specified retention period
"""

import os
import sys
from pathlib import Path
from datetime import datetime, timedelta
import logging
import argparse

# Setup logging for this script
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

DEFAULT_RETENTION_DAYS = 30
LOG_DIR = Path("/app/logs")
ARCHIVE_DIR = LOG_DIR / "archive"


def get_file_age_days(file_path: Path) -> int:
    """Get the age of a file in days"""
    file_time = datetime.fromtimestamp(file_path.stat().st_mtime)
    age = datetime.now() - file_time
    return age.days


def cleanup_old_logs(retention_days: int = DEFAULT_RETENTION_DAYS, dry_run: bool = False):
    """
    Remove log files older than retention period

    Args:
        retention_days: Number of days to retain logs
        dry_run: If True, only show what would be deleted without actually deleting
    """
    logger.info(f"Starting log cleanup - Retention: {retention_days} days, Dry run: {dry_run}")

    if not LOG_DIR.exists():
        logger.warning(f"Log directory {LOG_DIR} does not exist")
        return

    total_size_freed = 0
    files_deleted = 0

    # Process all log files
    for log_file in LOG_DIR.glob("**/*.log*"):
        # Skip archive directory
        if ARCHIVE_DIR in log_file.parents:
            continue

        try:
            age_days = get_file_age_days(log_file)

            if age_days > retention_days:
                file_size = log_file.stat().st_size

                if dry_run:
                    logger.info(f"Would delete: {log_file} (Age: {age_days} days, Size: {file_size / 1024:.1f} KB)")
                else:
                    logger.info(f"Deleting: {log_file} (Age: {age_days} days, Size: {file_size / 1024:.1f} KB)")
                    log_file.unlink()

                total_size_freed += file_size
                files_deleted += 1

        except Exception as e:
            logger.error(f"Error processing {log_file}: {e}")

    # Summary
    if dry_run:
        logger.info(f"Dry run complete - Would delete {files_deleted} files, freeing {total_size_freed / (1024 * 1024):.2f} MB")
    else:
        logger.info(f"Cleanup complete - Deleted {files_deleted} files, freed {total_size_freed / (1024 * 1024):.2f} MB")


def compress_old_logs(age_days: int = 7, dry_run: bool = False):
    """
    Compress log files older than specified age

    Args:
        age_days: Compress files older than this many days
        dry_run: If True, only show what would be compressed
    """
    import gzip
    import shutil

    logger.info(f"Starting log compression - Age threshold: {age_days} days")

    if not LOG_DIR.exists():
        logger.warning(f"Log directory {LOG_DIR} does not exist")
        return

    files_compressed = 0
    space_saved = 0

    for log_file in LOG_DIR.glob("**/*.log"):
        # Skip already compressed files
        if log_file.suffix == '.gz':
            continue

        try:
            file_age = get_file_age_days(log_file)

            if file_age > age_days:
                original_size = log_file.stat().st_size
                compressed_path = log_file.with_suffix('.log.gz')

                if dry_run:
                    logger.info(f"Would compress: {log_file} ({original_size / 1024:.1f} KB)")
                else:
                    logger.info(f"Compressing: {log_file}")
                    with open(log_file, 'rb') as f_in:
                        with gzip.open(compressed_path, 'wb') as f_out:
                            shutil.copyfileobj(f_in, f_out)

                    compressed_size = compressed_path.stat().st_size
                    space_saved += original_size - compressed_size
                    log_file.unlink()
                    files_compressed += 1

                    logger.debug(f"Compressed {original_size / 1024:.1f} KB -> {compressed_size / 1024:.1f} KB")

        except Exception as e:
            logger.error(f"Error compressing {log_file}: {e}")

    if dry_run:
        logger.info(f"Dry run complete - Would compress {files_compressed} files")
    else:
        logger.info(f"Compression complete - Compressed {files_compressed} files, saved {space_saved / (1024 * 1024):.2f} MB")


def archive_logs(archive_days: int = 90, dry_run: bool = False):
    """
    Move old logs to archive directory

    Args:
        archive_days: Archive files older than this many days
        dry_run: If True, only show what would be archived
    """
    logger.info(f"Starting log archival - Age threshold: {archive_days} days")

    if not LOG_DIR.exists():
        logger.warning(f"Log directory {LOG_DIR} does not exist")
        return

    # Create archive directory if needed
    if not dry_run and not ARCHIVE_DIR.exists():
        ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)

    files_archived = 0

    for log_file in LOG_DIR.glob("*.log*"):
        try:
            file_age = get_file_age_days(log_file)

            if file_age > archive_days:
                archive_path = ARCHIVE_DIR / log_file.name

                if dry_run:
                    logger.info(f"Would archive: {log_file} -> {archive_path}")
                else:
                    logger.info(f"Archiving: {log_file}")
                    log_file.rename(archive_path)
                    files_archived += 1

        except Exception as e:
            logger.error(f"Error archiving {log_file}: {e}")

    if dry_run:
        logger.info(f"Dry run complete - Would archive {files_archived} files")
    else:
        logger.info(f"Archival complete - Archived {files_archived} files")


def get_log_statistics():
    """Get statistics about current log files"""
    if not LOG_DIR.exists():
        logger.warning(f"Log directory {LOG_DIR} does not exist")
        return

    total_size = 0
    file_count = 0
    oldest_file = None
    oldest_age = 0

    for log_file in LOG_DIR.glob("**/*.log*"):
        file_count += 1
        total_size += log_file.stat().st_size

        age = get_file_age_days(log_file)
        if age > oldest_age:
            oldest_age = age
            oldest_file = log_file

    logger.info("=== Log Statistics ===")
    logger.info(f"Total log files: {file_count}")
    logger.info(f"Total size: {total_size / (1024 * 1024):.2f} MB")
    if oldest_file:
        logger.info(f"Oldest file: {oldest_file.name} ({oldest_age} days old)")


def main():
    parser = argparse.ArgumentParser(description="Log file cleanup and maintenance")
    parser.add_argument('--retention-days', type=int, default=DEFAULT_RETENTION_DAYS,
                        help=f"Number of days to retain logs (default: {DEFAULT_RETENTION_DAYS})")
    parser.add_argument('--compress-age', type=int, default=7,
                        help="Compress logs older than this many days (default: 7)")
    parser.add_argument('--archive-age', type=int, default=90,
                        help="Archive logs older than this many days (default: 90)")
    parser.add_argument('--dry-run', action='store_true',
                        help="Show what would be done without actually doing it")
    parser.add_argument('--stats-only', action='store_true',
                        help="Only show log statistics")
    parser.add_argument('--no-compress', action='store_true',
                        help="Skip compression step")
    parser.add_argument('--no-archive', action='store_true',
                        help="Skip archival step")

    args = parser.parse_args()

    if args.stats_only:
        get_log_statistics()
    else:
        # Compress first (if enabled)
        if not args.no_compress:
            compress_old_logs(args.compress_age, args.dry_run)

        # Archive (if enabled)
        if not args.no_archive:
            archive_logs(args.archive_age, args.dry_run)

        # Clean up old logs
        cleanup_old_logs(args.retention_days, args.dry_run)

        # Show final statistics
        if not args.dry_run:
            get_log_statistics()


if __name__ == "__main__":
    main()