from django.apps import AppConfig


class TrackerConfig(AppConfig):
    name = 'tracker'

    def ready(self):
        import os
        import threading
        if os.environ.get('RUN_MAIN') != 'true':
            def warm_apk():
                try:
                    from tracker.views import ensure_apk_cached_on_disk
                    ensure_apk_cached_on_disk()
                except Exception:
                    pass
            threading.Thread(target=warm_apk, daemon=True).start()
