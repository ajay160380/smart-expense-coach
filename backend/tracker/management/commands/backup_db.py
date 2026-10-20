import os
import gzip
import shutil
from datetime import datetime
from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.conf import settings

def perform_db_backup():
    """
    Core function to perform a database backup and prune old backups.
    Returns a dict with backup metadata.
    """
    backup_dir = os.path.join(settings.BASE_DIR, 'backups')
    os.makedirs(backup_dir, exist_ok=True)

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    json_path = os.path.join(backup_dir, f"backup_{timestamp}.json")
    gz_path = f"{json_path}.gz"

    # Export all tracker & auth data via dumpdata
    with open(json_path, 'w', encoding='utf-8') as f:
        call_command(
            'dumpdata',
            'auth.user',
            'tracker',
            indent=2,
            stdout=f,
            exclude=['contenttypes', 'auth.permission']
        )

    # Gzip compress the JSON backup
    with open(json_path, 'rb') as f_in:
        with gzip.open(gz_path, 'wb') as f_out:
            shutil.copyfileobj(f_in, f_out)

    # Remove uncompressed raw JSON
    if os.path.exists(json_path):
        os.remove(json_path)

    size_bytes = os.path.getsize(gz_path)
    size_kb = round(size_bytes / 1024, 2)

    # Prune old backups — keep most recent 10
    backups = sorted(
        [os.path.join(backup_dir, f) for f in os.listdir(backup_dir) if f.startswith('backup_') and f.endswith('.json.gz')],
        key=os.path.getmtime,
        reverse=True
    )
    for old_backup in backups[10:]:
        try:
            os.remove(old_backup)
        except OSError:
            pass

    return {
        'filename': os.path.basename(gz_path),
        'filepath': gz_path,
        'size_kb': size_kb,
        'timestamp': timestamp,
        'total_backups': min(len(backups), 10)
    }

class Command(BaseCommand):
    help = 'Creates a compressed JSON snapshot backup of application data and prunes old backups.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Starting database backup...'))
        try:
            info = perform_db_backup()
            self.stdout.write(self.style.SUCCESS(
                f"✅ Database backup successful!\n"
                f"   File: {info['filename']}\n"
                f"   Size: {info['size_kb']} KB\n"
                f"   Stored at: {info['filepath']}"
            ))
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"❌ Backup failed: {str(e)}"))
