const express = require('express');
const mineflayer = require('mineflayer');
const readline = require('readline');

const RECONNECT_DELAY = 240000;

const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot đang Farm VIP Pro!'));
app.listen(port, () => console.log(`[Web] Server đang chạy trên port ${port}`));

process.on('uncaughtException', (err) => console.log('[Khiên Bất Tử] Chặn lỗi:', err.message));
process.on('unhandledRejection', (err) => console.log('[Khiên Bất Tử] Lỗi Promise:', err.message));

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const randomSleep = (min, max) => sleep(Math.floor(Math.random() * (max - min + 1) + min));

let botState = 'HUB'; 
let currentBot; 
let clickLoop; 
let isComboRunning = false; 

function createBot() {
    const bot = mineflayer.createBot({
        host: 'aemine.vn',
        port: 25565,
        username: 'winlxag5554', 
        version: '1.12.2',
        viewDistance: 'tiny', 
        checkTimeoutInterval: 90000,
        respawn: false 
    });

    currentBot = bot; 

    // CẢM BIẾN TÚI ĐỒ (Mắt thần mới)
    setInterval(() => {
        if (!bot.inventory) return;
        const hasCompass = bot.inventory.items().find(i => i.name === 'compass');
        
        if (hasCompass && botState === 'FARMING') {
            botState = 'HUB'; // Bị văng về Hub rồi
        }
        
        if (!hasCompass && botState === 'HUB') {
            // Đã vào game, bỏ qua la bàn
            botState = 'FARMING';
            startFarmingProcess(bot);
        }
    }, 5000);

    bot.on('spawn', async () => {
        console.log('[Hub] Đã kết nối, đang đăng nhập...');
        await sleep(2000);
        bot.chat('/l Windvu2193'); 
        
        // Vẩy la bàn nếu đang ở Hub
        await sleep(4000);
        if (botState === 'HUB') startCompassLoop(bot);
    });

    bot.on('windowOpen', async (window) => {
        if (botState !== 'HUB') return; 
        try {
            await sleep(2000);
            await bot.clickWindow(20, 0, 0); 
            await sleep(2000);
            await bot.clickWindow(14, 0, 0); 
            console.log('[Menu] Đã click xong! Chờ server load map...');
        } catch (err) {
            console.log('Lỗi click GUI:', err.message);
        }
    });

    bot.on('end', () => {
        setTimeout(createBot, RECONNECT_DELAY);
    });
}

// Hàm vẩy la bàn (Chỉ chạy khi có la bàn trong túi)
function startCompassLoop(bot) {
    if (clickLoop) clearInterval(clickLoop);
    bot.setQuickBarSlot(4); 
    clickLoop = setInterval(() => {
        if (botState === 'HUB') {
            bot.activateItem();
        } else {
            clearInterval(clickLoop);
        }
    }, 3000);
}

// ==========================================
// KỊCH BẢN DI CHUYỂN BẤT KHẢ XÂM PHẠM (GIỮ NGUYÊN)
// ==========================================
async function startFarmingProcess(bot) {
    if (isComboRunning) return; 
    isComboRunning = true;
    console.log('[Farm] Bắt đầu chạy kịch bản múa...');

    try {
        bot.chat('/party quit'); await sleep(1500);
        bot.chat('/party join 18110998125'); await sleep(2000);
        
        bot.setQuickBarSlot(0); await randomSleep(100, 110);
        
        bot.setControlState('sneak', true); await randomSleep(100, 110); 
        bot.swingArm('right'); await randomSleep(100, 110);
        bot.activateItem(); await randomSleep(100, 110);
        bot.activateItem(); await randomSleep(100, 110);
        bot.activateItem(); await randomSleep(100, 110);
        bot.setControlState('sneak', false); 

        bot.chat('/spawn'); await sleep(6000); 

        bot.setControlState('forward', true);
        bot.setControlState('sprint', true);
        
        for(let i=0; i<3; i++) {
            bot.setControlState('jump', true);
            await sleep(400);
            bot.setControlState('jump', false);
            await sleep(1100);
        }
        await sleep(1600);
        bot.clearControlStates(); 
        
        console.log('[Farm] Đang lùi xéo...');
        bot.setControlState('back', true); 
        bot.setControlState('left', true); 
        await sleep(500); 
        bot.clearControlStates(); 

        await sleep(5000);
        bot.chat('/home');
        await sleep(6000); 
        bot.chat('/lay');
        
        console.log('[Farm] Đã đến bãi, nằm nghỉ!');

    } catch (err) {
        console.log('[Farm] Lỗi:', err.message);
    } finally {
        isComboRunning = false; 
    }
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.on('line', (input) => { if (currentBot) currentBot.chat(input); });

createBot();
