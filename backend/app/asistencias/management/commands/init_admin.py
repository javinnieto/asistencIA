from django.core.management.base import BaseCommand
from django.contrib.auth.models import User

class Command(BaseCommand):
    def handle(self, *args, **options):
        if not User.objects.filter(username='javinnieto').exists():
            User.objects.create_superuser('javinnieto', 'javinnieto@example.com', 'javinnieto')
            self.stdout.write(self.style.SUCCESS('Admin user javinnieto created!'))
        else:
            self.stdout.write(self.style.WARNING('Admin user already exists.'))
