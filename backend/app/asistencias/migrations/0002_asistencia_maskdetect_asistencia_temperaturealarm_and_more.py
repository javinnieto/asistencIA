# Generated by Django 5.2.4 on 2025-07-03 00:46

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('asistencias', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='asistencia',
            name='maskDetect',
            field=models.BooleanField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='asistencia',
            name='temperatureAlarm',
            field=models.BooleanField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='asistencia',
            name='verifyResult',
            field=models.CharField(blank=True, max_length=20, null=True),
        ),
        migrations.AddField(
            model_name='persona',
            name='nombreTerminal',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AlterField(
            model_name='estadoasistencia',
            name='descripcion',
            field=models.TextField(blank=True, max_length=200, null=True),
        ),
    ]
