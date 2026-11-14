const token = 'bot533681:99ee0640-7fc3-494f-a4c7-646d1bc15c2f';
const chatId = '35773773';

console.log('Sending test message to EitaaYar...');
fetch(`https://eitaayar.ir/api/${token}/sendMessage`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ chat_id: chatId, text: 'تست موفقیت‌آمیز بود! 🎉', parse_mode: 'HTML' })
})
  .then(async (r) => {
    const data = await r.json();
    console.log('Response status:', r.status);
    console.log('Response body:', data);
  })
  .catch(console.error);
