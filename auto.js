const express = require('express');
const mineflayer = require('mineflayer');
const readline = require('readline'); // Kéo thêm module đọc bàn phím

const RECONNECT_DELAY = 240000; // 3 phút vào lại 1 lần

// TẠO WEB SERVER (CHỐNG SLEEP)
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot Fonggggg đang Farm VIP Pro!'));
app.listen(port, () => console.log(`[Web] Server đang chạy trên port ${port}`));

// KHIÊN BẤT TỬ
process.on('uncaughtException', (err) => console.log('[Khiên Bất Tử] Chặn lỗi:', err.message));
process.on('unhandledRejection', (err) => console.log('[Khiên Bất Tử] Lỗi Promise:', err.message));

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const randomSleep = (min, max) => sleep(Math.floor(Math.random() * (max - min + 1) + min));

// BIẾN TRẠNG THÁI & NGỦ ĐÔNG
let botState = 'HUB'; 
let currentBot; 
let clickLoop; 
let antiAfkLoop; 
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

    // ==========================================
    // MẮT THẦN: SOI CHAT SERVER
    // ==========================================
    bot.on('message', (jsonMsg) => {
        if (jsonMsg.toAnsi) {
            console.log(jsonMsg.toAnsi());
        } else {
            console.log(jsonMsg.toString());
        }
    });

    bot.on('spawn', async () => {
        if (botState === 'HUB' && !isLoggingIn) {
            isLoggingIn = true;
            console.log('[Hub] Đã vào sảnh, chuẩn bị đăng nhập...');
            await sleep(2000);
            bot.chat('/l Windvu2193'); 
            await sleep(6000); 

            console.log('[Hub] Cầm La bàn lên tay...');
            bot.setQuickBarSlot(4); 
            await sleep(1000);
            
            if (clickLoop) clearInterval(clickLoop);
            clickLoop = setInterval(() => {
                if (botState === 'HUB') {
                    console.log(`[Hub] Đang click La bàn...`);
                    bot.activateItem(); 
                } else {
                    clearInterval(clickLoop);
                }
            }, 2500); 
        }
    });

    bot.on('messagestr', (message) => {
        const lowerMsg = message.toLowerCase();

        // ==========================================
        // CẢM BIẾN CHỐNG KẸT HUB (TỰ RESET TRẠNG THÁI)
        // ==========================================
        if (lowerMsg.includes('kicked from') || lowerMsg.includes('bảo trì') || lowerMsg.includes('đã đóng')) {
            if (botState === 'FARMING') {
                console.log('[Hệ thống] Bị ném về Sảnh! Reset trạng thái để tự động đục lỗ vào lại...');
                botState = 'HUB';
                isLoggingIn = false; 
                isComboRunning = false;
                if (antiAfkLoop) clearInterval(antiAfkLoop);
                if (clickLoop) clearInterval(clickLoop);
            }
        }
        // ==========================================

        if (message.includes('/pt join')) {
            const match = message.match(/\/pt join (\S+)/);
            if (match) {
                bot.chat(`/party join ${match[1]}`);
            }
        }

        const isKilledByPlayer = message.includes(bot.username) && 
                                 (lowerMsg.includes('slain by') || 
                                  lowerMsg.includes('slained by') || 
                                  lowerMsg.includes('giết'));
        
        if (isKilledByPlayer) {
            console.log('[RÚT LUI KHẨN CẤP] Bị KS! Nằm im giả chết chờ server kick AFK...');
            shouldReconnect = false; 
        }

        if (message.includes('không thể ngồi trong không khí')) {
            setTimeout(() => { if (botState === 'FARMING') bot.chat('/sit'); }, 3000);
        }
    });

    bot.on('windowOpen', async (window) => {
        if (botState !== 'HUB') return; 
        botState = 'CLICKING_MENU'; 
        if (clickLoop) clearInterval(clickLoop);

        try {
            await sleep(3000); 
            console.log(`[Menu 1] Nhấp slot 20...`);
            await bot.clickWindow(20, 0, 0); 

            await sleep(2500); 
            console.log(`[Menu 2] Nhấp slot 14...`);
            await bot.clickWindow(14, 0, 0); 
            
            botState = 'FARMING'; 
            console.log('[Menu] Thành công! Đợi 15s load map...');
            setTimeout(() => startFarmingProcess(bot), 15000); 
        } catch (err) {
            console.log('Lỗi click GUI:', err.message);
            botState = 'HUB'; 
        }
    });

    bot.on('death', async () => {
        console.log('[CẢNH BÁO] Bot đã tử trận! Đang nằm phơi xác tại trận địa...');
        isComboRunning = false; 
        bot.clearControlStates(); 
        if (antiAfkLoop) clearInterval(antiAfkLoop);
        if (clickLoop) clearInterval(clickLoop);
    });

    bot.on('end', () => {
        if (!shouldReconnect) {
            console.log('[SHUTDOWN] Server đã kick nick ra ngoài do AFK/Bị KS!');
            if (antiAfkLoop) clearInterval(antiAfkLoop); 
            if (clickLoop) clearInterval(clickLoop);
            return; 
        }

        botState = 'HUB'; 
        isLoggingIn = false;
        isComboRunning = false;
        if (antiAfkLoop) clearInterval(antiAfkLoop); 
        if (clickLoop) clearInterval(clickLoop);

        failCount++; 
        
        if (failCount >= 5) {
            console.log(`[BÁO ĐỘNG] Rớt mạng ${failCount} lần! Ngủ đông 1 tiếng tránh bị Ban...`);
            failCount = 0; 
            setTimeout(createBot, 3600000); 
            return;
        }

        console.log(`[Mất mạng] Lần rớt thứ ${failCount}. Đợi ${RECONNECT_DELAY / 60000} phút để vào lại...`);
        setTimeout(createBot, RECONNECT_DELAY); 
    });

    bot.on('kicked', (reason) => {
        console.log(`[SERVER KICK] Lý do: ${reason.toString()}`);
    });

    bot.on('error', err => {});
}

async function startFarmingProcess(bot) {
    if (isComboRunning) return; 
    isComboRunning = true;

    try {
        bot.setQuickBarSlot(0); 
        await randomSleep(7000, 9000);
        // BAY ĐẾN BÃI TRƯỚC RỒI MỚI MÚA TAY
        bot.chat('/spawn');
        await randomSleep(8000, 10000); 

        // ==========================================
        // BƯỚC MỚI: CTRL + W CHẠY THỤC MẠNG 5 GIÂY
        // ==========================================
        console.log('[Farm] Tới Spawn rồi, Ctrl + W phi lên phía trước 5 giây cho thoáng...');
        
        // Bật cả 2 phím: W (Tiến lên) và Ctrl (Chạy nhanh)
        bot.setControlState('forward', true); 
        bot.setControlState('sprint', true); 
        
        // Đợi khoảng 5 giây (5000ms đến 5200ms)
        await randomSleep(5000, 5200); 
        
        // Nhả toàn bộ phím ra để phanh gấp
        bot.clearControlStates(); 
        await randomSleep(500, 800); // Khựng lại thở một nhịp rồi mới lom khom múa tay
        
        // BẮT ĐẦU ĐÈ SHIFT
        bot.setControlState('sneak', true); 
        await randomSleep(800, 1200); 
        
        // COMBO TRÁI - PHẢI - PHẢI - PHẢI
        bot.swingArm('right'); 
        await randomSleep(600, 1000);
        bot.activateItem(); 
        await randomSleep(600, 1000);
        bot.activateItem(); 
        await randomSleep(600, 1000);
        bot.activateItem(); 
        await randomSleep(1000, 1500);

        // NHẢ SHIFT NGAY TẠI ĐÂY
        bot.setControlState('sneak', false); 

        await randomSleep(8000, 10000); 
        
        // Đề phòng hờ, xóa toàn bộ phím đang dính 
        bot.clearControlStates(); 
        await randomSleep(2000, 3000); 

        bot.chat('/home'); // Xong combo thì bay về bãi
        await randomSleep(10000, 12000); // Tăng delay xíu cho map load xong
        
        console.log('[Farm] Đã load map bãi farm, chuẩn bị nhích bước tới...');
    
        
        // Đợi thêm 1 giây cho đứng vững rồi mới ngồi (ĐÃ BỔ SUNG LỆNH /SIT)
        await sleep(1000);
        bot.chat('/sit');
        console.log('[Farm] Đã nhích đúng vị trí, ngồi xuống và khởi động Auto Kit (10 phút/lần)!');

        failCount = 0; 

        // VÒNG LẶP CHỐNG AFK: ĐÚNG 10 PHÚT GÕ /KIT TANTHU 1 LẦN
        if (antiAfkLoop) clearInterval(antiAfkLoop);
        antiAfkLoop = setInterval(() => {
            if (botState === 'FARMING' && !isComboRunning) {
                bot.chat('/kit tanthu');
                console.log(`[${new Date().toLocaleTimeString()}] [Auto-Kit] Đã gõ /kit tanthu lụm đồ!`);
            }
        }, 600000); // 600000 ms = đúng 10 phút
        
    } catch (err) {
        console.log('[Farm] Lỗi:', err.message);
    } finally {
        isComboRunning = false; 
    }
}

// ==========================================
// TÍNH NĂNG CHAT TỪ REPLIT VÀO GAME
// ==========================================
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.on('line', (input) => {
    if (currentBot) {
        currentBot.chat(input); 
        console.log(`[Bạn Đã Chat]: ${input}`);
    } else {
        console.log('[Lỗi] Bot chưa vào game, không chat được!');
    }
});

createBot();
