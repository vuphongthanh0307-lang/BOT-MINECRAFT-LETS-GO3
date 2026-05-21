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

let botState = 'FIRST_LOGIN'; // Trạng thái ban đầu
let currentBot; 
let antiAfkLoop; 
let isLoggingIn = false; 
let isComboRunning = false; 
let isGUIOpen = false; 

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

    bot.on('spawn', async () => {
        if (!isLoggingIn) { 
            isLoggingIn = true;
            console.log('[Hub] Đã kết nối, đang đăng nhập...');
            await sleep(2000);
            bot.chat('/l Windvu2193'); 
        }
    });

    // ==========================================
    // MẮT THẦN ĐỌC TÚI ĐỒ (BẢN TỰ RESET KHI VÀO LẠI)
    // ==========================================
    setInterval(() => {
        if (!currentBot || !currentBot.inventory) return;
        const itemCount = currentBot.inventory.items().length;

        // 1. Vô cụm Farm: Đồ nhiều (>= 8 món)
        if (itemCount >= 8) {
            // Nếu trước đó đang ở Hub hoặc vừa reset, cho phép múa lại
            if (botState !== 'FARMING') {
                botState = 'FARMING';
                isComboRunning = false; // MỞ KHÓA MÚA
                console.log('[Mắt Thần] Thấy thanh đồ FULL! Xác nhận đã vào Cụm Farm. Bắt đầu múa!');
                startFarmingProcess(currentBot);
            }
        }
        // 2. Ở Hub: Đồ ít (<= 3 món, chỉ có la bàn)
        else if (itemCount > 0 && itemCount <= 3) {
            // Nếu đang ở trạng thái FARMING mà mất đồ (bị kick ra Hub) -> Reset về HUB để vẩy la bàn
            if (botState === 'FARMING') {
                botState = 'FIRST_LOGIN'; 
                isComboRunning = false;
            }

            if (botState === 'FIRST_LOGIN') {
                if (!isGUIOpen) {
                    console.log('[Hub] Đang ở sảnh! Cầm la bàn đục lỗ...');
                    currentBot.setQuickBarSlot(4);
                    currentBot.activateItem();
                }
            } 
        }
    }, 3000); 

    bot.on('windowOpen', async (window) => {
        if (isGUIOpen) return; 
        isGUIOpen = true; 
        try {
            console.log('[Menu] Đang mở GUI...');
            await sleep(2000);
            await bot.clickWindow(20, 0, 0); 
            await sleep(2000);
            await bot.clickWindow(14, 0, 0); 
            console.log('[Menu] Đã click xong!');
        } catch (err) {
            console.log('Lỗi click GUI:', err.message);
        } finally {
            isGUIOpen = false; 
        }
    });

    bot.on('death', () => {
        bot.clearControlStates();
        if (botState !== 'FARMING') setTimeout(() => bot.respawn(), 2000);
    });

    bot.on('end', () => {
        isLoggingIn = false;
        botState = 'FIRST_LOGIN';
        setTimeout(createBot, RECONNECT_DELAY);
    });
}

// KỊCH BẢN DI CHUYỂN (GIỮ NGUYÊN 100%)
async function startFarmingProcess(bot) {
    if (isComboRunning) return; 
    isComboRunning = true;
    console.log('[Farm] Bắt đầu kịch bản...');

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

        await sleep(25000);
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
        isComboRunning = false; // Nếu lỗi múa thì mở khóa cho lần sau
    }
}

createBot();
