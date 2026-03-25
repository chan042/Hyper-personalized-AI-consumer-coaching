from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("coaching", "0008_coachinggenerationrequest"),
    ]

    operations = [
        migrations.AddField(
            model_name="coaching",
            name="generation_reason",
            field=models.TextField(blank=True, default=""),
        ),
    ]
