const express = require('express');
const mineflayer = require('mineflayer');
const readline = require('readline');

const RECONNECT_DELAY = 240000;

const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot Fonggggg đang Farm VIP Pro!'));
app.listen(port, () => console.log(`[Web] Server đang chạy trên port ${port}`));

process.on('uncaughtException', (err) => console.log('[Khiên Bất Tử] Chặn lỗi:', err.message));
process.on('unhandledRejection', (err) => console.log('[Khiên Bất Tử] Lỗi Promise:', err.message));

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const randomSleep = (min, max) => sleep(Math.floor(Math.random() * (max - min + 1) + min));

let botState = 'HUB'; 
let currentBot; 
let clickLoop; 
let antiAfkLoop; 
let farmTimeout; 
let isLoggingIn = false; 
let isComboRunning = false; 
let shouldReconnect = true; 
let failCount = 0; 

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

    bot.on('message', (jsonMsg) => {
        if (jsonMsg.toAnsi) console.log(jsonMsg.toAnsi());
        else console.log(jsonMsg.toString());
    });

    bot.on('spawn', async () => {
        if (!isLoggingIn) { 
            isLoggingIn = true;
            console.log('[Hub] Đã kết nối, đang đăng nhập...');
            await sleep(2000);
            bot.chat('/l Windvu2193'); 
        }
    });

    bot.on('messagestr', (message) => {
        const lowerMsg = message.toLowerCase();

        if (botState === 'HUB' && lowerMsg.includes('bạn sở hữu')) {
            console.log('[Mắt Thần] Cầm La bàn đục lỗ...');
            bot.setQuickBarSlot(4); 
            let clickCount = 0;
            if (clickLoop) clearInterval(clickLoop);
            clickLoop = setInterval(() => {
                if (botState === 'HUB') {
                    bot.activateItem(); 
                    clickCount++;
                    if (clickCount >= 6) {
                        clearInterval(clickLoop);
                        botState = 'FARMING';
                        startFarmingProcess(bot);
                    }
                } else clearInterval(clickLoop);
            }, 3000); 
        }

        if (lowerMsg.includes('kicked from') || lowerMsg.includes('bảo trì') || lowerMsg.includes('đã đóng')) {
            if (botState === 'FARMING' || botState === 'HUB') {
                console.log('[Hệ thống] Bảo trì! Nằm chờ server kéo...');
                botState = 'WAIT_AUTO'; 
                isComboRunning = false;
                if (clickLoop) clearInterval(clickLoop);
                if (farmTimeout) clearTimeout(farmTimeout);
            }
        }

        const isJoinMsg = lowerMsg.includes('vừa tham gia máy chủ') && message.includes(bot.username);
        const hasGameMsg = lowerMsg.includes('boss') || lowerMsg.includes('tài xỉu') || lowerMsg.includes('nô lệ');
        
        if (botState !== 'FARMING' && (isJoinMsg || hasGameMessage)) {
            console.log(`[Mắt Thần] Đã vào Game! Chạy kịch bản múa...`);
            botState = 'FARMING'; 
            if (clickLoop) clearInterval(clickLoop);
            if (farmTimeout) clearTimeout(farmTimeout);
            farmTimeout = setTimeout(() => startFarmingProcess(bot), 3000);
        }

        if (lowerMsg.includes('unable to connect')) {
            if (botState !== 'WAIT_AUTO') { 
                botState = 'HUB'; 
                bot.setQuickBarSlot(4); 
                clickLoop = setInterval(() => bot.activateItem(), 3000);
            }
        }
    });

    bot.on('death', async () => {
        isComboRunning = false; 
        bot.clearControlStates(); 
        if (farmTimeout) clearTimeout(farmTimeout);
        if (botState === 'HUB') setTimeout(() => bot.respawn(), 2000); 
    });

    bot.on('end', () => {
        if (!shouldReconnect) return;
        botState = 'HUB'; isLoggingIn = false; isComboRunning = false;
        failCount++;
        setTimeout(createBot, RECONNECT_DELAY); 
    });
}

async function startFarmingProcess(bot) {
    if (isComboRunning) return; 
    isComboRunning = true;

    try {
        bot.setQuickBarSlot(0); 
        await sleep(1000);
        
        // Múa tay tại chỗ
        bot.setControlState('sneak', true); 
        await sleep(200); 
        bot.swingArm('right'); await sleep(110);
        bot.activateItem(); await sleep(110);
        bot.activateItem(); await sleep(110);
        bot.activateItem(); await sleep(110);
        bot.setControlState('sneak', false); 

        // Spawn + Chạy 5s + 3 Nhảy
        bot.chat('/spawn');
        await sleep(8000); 

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
        console.log('[Farm] Đang lùi xéo bằng phím D + S trong 0.5 giây...');
        bot.setControlState('back', true);  // Đè phím S
        bot.setControlState('left', true); // Đè phím D
        
        await sleep(500); // Giữ đúng 0.5 giây
        bot.clearControlStates(); // Nhả cả 2 phím ra để phanh lại

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
