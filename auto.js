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

let botState = 'HUB'; 
let currentBot; 
let clickLoop; 
let antiAfkLoop; 
let isLoggingIn = false; 
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

    bot.on('spawn', async () => {
        if (!isLoggingIn) { 
            isLoggingIn = true;
            console.log('[Hub] Đã kết nối, đang đăng nhập...');
            await sleep(2000);
            bot.chat('/l Windvu2193'); 
            
            // Chờ 5s cho login xong rồi vẩy la bàn
            await sleep(5000);
            if (botState === 'HUB') startCompassLoop(bot);
        }
    });

    bot.on('messagestr', (message) => {
        const lowerMsg = message.toLowerCase();

        // 1. Phát hiện Bảo trì/Kick (Nằm chờ, không làm gì cả)
        if (lowerMsg.includes('kicked from') || lowerMsg.includes('bảo trì') || lowerMsg.includes('đã đóng')) {
            console.log('[Mắt Thần] Bảo trì! Chuyển chế độ Nằm Chờ...');
            botState = 'MAINTENANCE'; 
            if (clickLoop) clearInterval(clickLoop);
            isComboRunning = false;
        }

        // 2. Nhận diện VÀO GAME
        const isJoinMsg = lowerMsg.includes('vừa tham gia máy chủ') && message.includes(bot.username);
        const hasGameMsg = lowerMsg.includes('boss') || lowerMsg.includes('tài xỉu') || lowerMsg.includes('nô lệ');
        
        if (botState !== 'FARMING' && (isJoinMsg || hasGameMsg)) {
            console.log('[Mắt Thần] Đã vào Game! Chạy kịch bản múa...');
            botState = 'FARMING'; 
            if (clickLoop) clearInterval(clickLoop);
            startFarmingProcess(bot);
        }
    });

    // ==========================================
    // BỘ CANH GÁC (WATCHDOG): Nếu HUB mà 40s ko thấy GUI thì vẩy lại
    // ==========================================
    function startCompassLoop(bot) {
        if (clickLoop) clearInterval(clickLoop);
        let ticks = 0;
        clickLoop = setInterval(() => {
            if (botState === 'HUB') {
                bot.setQuickBarSlot(4); // Ép cầm slot 4
                bot.activateItem();     // Vẩy la bàn
                ticks++;
                if (ticks > 12) { // Sau 36s không mở được GUI -> Reset
                    console.log('[Cảnh báo] Kẹt GUI, vẩy lại từ đầu...');
                    ticks = 0;
                }
            } else {
                clearInterval(clickLoop);
            }
        }, 3000);
    }

    bot.on('windowOpen', async (window) => {
        if (botState !== 'HUB') return; 
        if (clickLoop) clearInterval(clickLoop);
        botState = 'WAITING'; // Đang thao tác GUI

        try {
            await sleep(2000);
            await bot.clickWindow(20, 0, 0); 
            await sleep(2000);
            await bot.clickWindow(14, 0, 0); 
            console.log('[Menu] Đã click xong! Chờ server load map...');
        } catch (err) {
            console.log('Lỗi click GUI:', err.message);
            botState = 'HUB';
            startCompassLoop(bot);
        }
    });

    bot.on('death', () => {
        isComboRunning = false;
        bot.clearControlStates();
        if (botState === 'HUB') setTimeout(() => bot.respawn(), 2000);
    });

    bot.on('end', () => {
        isLoggingIn = false;
        setTimeout(createBot, RECONNECT_DELAY);
    });
}

// KỊCH BẢN CỦA BRO (GIỮ NGUYÊN)
async function startFarmingProcess(bot) {
    if (isComboRunning) return; 
    isComboRunning = true;

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

        if (antiAfkLoop) clearInterval(antiAfkLoop);
        antiAfkLoop = setInterval(() => {
            if (botState === 'FARMING') bot.chat('/kit tanthu');
        }, 1200000); 

    } catch (err) {
        console.log('[Farm] Lỗi:', err.message);
    } finally {
        isComboRunning = false; 
    }
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.on('line', (input) => { if (currentBot) currentBot.chat(input); });

createBot();
