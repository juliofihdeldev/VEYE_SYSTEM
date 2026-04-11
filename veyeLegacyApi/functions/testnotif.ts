curl --request POST \
  --url 'https://onesignal.com/api/v1/notifications' \
  --header 'Authorization: Basic os_v2_app_c5tjalpmunbvbkvkxwdqjjdvjdtgay45jlouzqfvgg5kuxmwtcw3jjhqrgacddezotf23wffva6a5vnp22asd53gqoqdoynxjq5ut4a' \
  --header 'Content-Type: application/json' \
  --data '{
  "app_id": "1766902d-eca3-4350-aaaa-bd8704a47548",
  "headings": { "en": "VEYe" },
  "contents": { "en": "Tiktok notif" },
  "included_segments": ["All"]
}'
