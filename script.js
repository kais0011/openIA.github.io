function checkEnter(event) {
    if (event.key === "Enter") {
        sendMessage();
    }
}

async function sendMessage() {
    const input = document.getElementById('message-input');
    const message = input.value;

    if (message) {
        appendMessage('user', message);
        await processMessage(message);
        input.value = '';
    }
}

function appendMessage(sender, message) {
    const chatWindow = document.getElementById('chat-window');
    const messageElement = document.createElement('div');
    messageElement.className = sender + '-message';
    messageElement.textContent = message;
    chatWindow.appendChild(messageElement);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

async function processMessage(message) {
    const lowerMessage = message.toLowerCase();
    showProgress();

    try {
        await new Promise(resolve => setTimeout(resolve, 1000));

        let response;

        if (isGreeting(lowerMessage)) {
            response = `مرحبًا! كيف حالك؟ كيف يمكنني مساعدتك اليوم؟`;
        } else {
            const keywords = extractKeywords(message);
            const limitedQueries = splitQuery(keywords.join(' '), 450);
            const searchResults = await Promise.all(limitedQueries.map(query => searchInternet(query)));

            if (searchResults.length > 0) {
                const combinedResult = searchResults.join(' ');
                response = generateResponse(message, combinedResult);
            } else {
                response = `لم أجد إجابة مباشرة لسؤالك. هل تود أن أبحث عن شيء آخر أو توضيح السؤال؟`;
            }
        }

        appendMessage('bot', response);
    } catch (error) {
        console.error('Error in processing message:', error);
        appendMessage('bot', 'حدث خطأ أثناء البحث. هل تود تجربة سؤال آخر؟');
    } finally {
        hideProgress();
    }
}

function showProgress() {
    document.getElementById('progress').style.display = 'block';
}

function hideProgress() {
    document.getElementById('progress').style.display = 'none';
}

function isGreeting(message) {
    const greetings = [
        'مرحب', 'سلام', 'hello', 'hi', 'bonjour', 'salut',
        'صباح الخير', 'مساء الخير', 'تحية', 'أهلاً', 'أهلا', 'هاي', 'هلا', 'كيف الحال', 'شخبارك'
    ];
    return greetings.some(greeting => message.includes(greeting));
}

function detectLanguage(message) {
    if (/[\u0600-\u06FF]/.test(message)) return 'ar';
    if (/[A-Za-zÀ-ÿ]/.test(message)) {
        return message.toLowerCase().includes('bonjour') ? 'fr' : 'en';
    }
    return 'en';
}

function extractKeywords(message) {
    return message.toLowerCase().split(' ').filter(word =>
        word.length > 2 &&
        !['هل', 'ما', 'كم', 'ما', 'رأيك', 'تعتقد', 'هو', 'هي', 'أن', 'عن', 'في', 'على', 'من', 'لل', 'بال', 'و'].includes(word)
    );
}

function splitQuery(query, maxLength) {
    const words = query.split(' ');
    const queries = [];
    let currentQuery = '';

    for (const word of words) {
        if ((currentQuery + ' ' + word).length > maxLength) {
            queries.push(currentQuery.trim());
            currentQuery = word;
        } else {
            currentQuery += ' ' + word;
        }
    }

    if (currentQuery) {
        queries.push(currentQuery.trim());
    }

    return queries;
}

async function searchInternet(query) {
    try {
        // استخدام Wikipedia API للبحث
        const response = await fetch(`https://ar.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`);
        const data = await response.json();

        // استخراج النتائج
        if (data.query && data.query.search) {
            const results = data.query.search.map(result => result.snippet);

            // إزالة العلامات من النتائج
            const cleanResults = results.map(result => 
                result.replace(/<[^>]+>/g, '') // إزالة جميع العلامات مثل <span> و</span>
                      .replace(/&quot;/g, '"') // استبدال &quot; بعلامات الاقتباس
                      .replace(/&amp;/g, '&')  // استبدال &amp; بعلامة &
                      .replace(/&lt;/g, '<')   // استبدال &lt; بعلامة <
                      .replace(/&gt;/g, '>')   // استبدال &gt; بعلامة >
            );

            return cleanResults.join(' ').slice(0, 450); // تقليل النص لتجنب طول الرسالة
        }
    } catch (error) {
        console.error('Error searching:', error);
    }
    return '';
}

function generateResponse(question, searchResult) {
    return `بناءً على ما وجدت، ${searchResult}. هل يمكنني مساعدتك في شيء آخر؟`;
}