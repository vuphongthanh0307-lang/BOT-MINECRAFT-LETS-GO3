const express = require('express');
const mineflayer = require('mineflayer');
const readline = require('readline'); 

const RECONNECT_DELAY = 260000; 

const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot Fonggggg đang Farm VIP Pro!'));
app.listen(port, () => console.log(`[Web] Server đang chạy trên port ${port}`));

process.on('uncaughtException', (err) => console.log('[Khiên Bất Tử] Chặn lỗi:', err.message));
process.on('unhandledRejection', (err) => console.log('[Khiên Bất Tử] Lỗi Promise:', err.message));

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const randomSleep = (min, max) => sleep(Math.floor(Math.random() * (max - min + 1) + min));

// BIẾN TRẠNG THÁI
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
        checkTimeoutInterval: 60000,
        respawn: false 
    });

    currentBot = bot; 

    bot.on('message', (jsonMsg) => {
        if (jsonMsg.toAnsi) {
            console.log(jsonMsg.toAnsi());
        } else {
            console.log(jsonMsg.toString());
        }
    });

    bot.on('spawn', async () => {
        if (!isLoggingIn) { 
            isLoggingIn = true;
            console.log('[Hub] Đã kết nối server, chuẩn bị đăng nhập...');
            await sleep(2000);
            bot.chat('/l Windvu2193'); 
            console.log('[Hub] Đã gửi lệnh login! Đang nghe ngóng...');
        }
    });

    bot.on('messagestr', (message) => {
        const lowerMsg = message.toLowerCase();

        // 1. MỚI JOIN TỪ NGOÀI VÀO -> CẦN BẤM LA BÀN
        if (botState === 'HUB' && lowerMsg.includes('bạn sở hữu')) {
            console.log('[Mắt Thần] Mới join từ ngoài vào! Cầm La bàn đục lỗ vô cụm...');
            bot.setQuickBarSlot(4); 
            let clickCount = 0;
            if (clickLoop) clearInterval(clickLoop);
            clickLoop = setInterval(() => {
                if (botState === 'HUB') {
                    console.log(`[Hub] Đang click La bàn...`);
                    bot.activateItem(); 
                    clickCount++;
                    if (clickCount >= 6) {
                        clearInterval(clickLoop);
                        botState = 'FARMING';
                        startFarmingProcess(bot);
                    }
                } else {
                    clearInterval(clickLoop);
                }
            }, 3000); 
        }

        // 2. SERVER BẢO TRÌ NÉM VỀ HUB -> TẮT CHẾ ĐỘ CLICK, NẰM CHỜ KÉO
        if (lowerMsg.includes('kicked from') || lowerMsg.includes('bảo trì') || lowerMsg.includes('đã đóng')) {
            if (botState === 'FARMING' || botState === 'HUB') {
                console.log('[Hệ thống] Server bảo trì ném ra Sảnh! CHUYỂN SANG CHẾ ĐỘ NẰM CHỜ SERVER TỰ KÉO LẠI VÀO...');
                botState = 'WAIT_AUTO'; 
                isComboRunning = false;
                if (clickLoop) clearInterval(clickLoop);
                if (farmTimeout) clearTimeout(farmTimeout);
                if (antiAfkLoop) clearInterval(antiAfkLoop);
            }
        }

        // 3. CỨ VÀO ĐƯỢC GAME THÌ CHẠY LỆNH FARM (Nhận diện theo ảnh bro gửi)
        if (botState !== 'FARMING' && lowerMsg.includes('vừa tham gia máy chủ') && message.includes(bot.username)) {
            console.log(`[Mắt Thần] Đã thấy báo: ">>> ${bot.username} vừa tham gia máy chủ"! Bắt đầu chạy kịch bản múa...`);
            botState = 'FARMING'; 
            
            if (clickLoop) clearInterval(clickLoop);
            if (farmTimeout) clearTimeout(farmTimeout);
            
            farmTimeout = setTimeout(() => startFarmingProcess(bot), 3000);
        }

        // 4. LỖI KẾT NỐI (UNABLE TO CONNECT) -> CLICK LA BÀN LẠI TỪ ĐẦU
        if (lowerMsg.includes('unable to connect') || lowerMsg.includes('không thể kết nối')) {
            if (botState !== 'WAIT_AUTO') { 
                console.log('[Lỗi Server] Bị từ chối vô cụm Farm! Lôi la bàn ra spam tiếp...');
                botState = 'HUB'; 
                isComboRunning = false;
                if (farmTimeout) clearTimeout(farmTimeout);
                
                bot.setQuickBarSlot(4); 
                if (clickLoop) clearInterval(clickLoop);
                clickLoop = setInterval(() => {
                    if (botState === 'HUB') {
                        bot.activateItem(); 
                    } else {
                        clearInterval(clickLoop);
                    }
                }, 3000); 
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
        if (clickLoop) clearInterval(clickLoop);

        try {
            await sleep(3000); 
            console.log(`[Menu 1] Nhấp slot 20...`);
            await bot.clickWindow(20, 0, 0); 

            await sleep(2500); 
            console.log(`[Menu 2] Nhấp slot 14...`);
            await bot.clickWindow(14, 0, 0); 
            
            console.log('[Menu] Thành công! Đợi load map xác nhận...');
            // Chờ sự kiện "vừa tham gia máy chủ" kích hoạt kịch bản Farm, không xài timeout mù nữa
        } catch (err) {
            console.log('Lỗi click GUI:', err.message);
            botState = 'HUB'; 
        }
    });

    bot.on('death', async () => {
        isComboRunning = false; 
        bot.clearControlStates(); 
        if (antiAfkLoop) clearInterval(antiAfkLoop);
        if (clickLoop) clearInterval(clickLoop);
        if (farmTimeout) clearTimeout(farmTimeout);

        if (botState === 'HUB' || botState === 'WAIT_AUTO') {
            console.log('[CẢNH BÁO] Bot chết ở Sảnh! Đang tự động ấn Hồi Sinh (Respawn)...');
            setTimeout(() => { bot.respawn(); }, 2000); 
        } else {
            console.log('[CẢNH BÁO] Bot bị giết trong cụm Farm! Nằm phơi xác không làm gì cả...');
        }
    });

    bot.on('end', () => {
        if (!shouldReconnect) {
            console.log('[SHUTDOWN] Server đã kick nick ra ngoài do AFK/Bị KS!');
            return; 
        }

        botState = 'HUB'; 
        isLoggingIn = false;
        isComboRunning = false;
        if (antiAfkLoop) clearInterval(antiAfkLoop); 
        if (clickLoop) clearInterval(clickLoop);
        if (farmTimeout) clearTimeout(farmTimeout);

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

// ==========================================

// KỊCH BẢN DI CHUYỂN (GIỮ NGUYÊN 100% CỦA BRO)

// ==========================================

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



        await sleep(1000);

        // Spawn + Chạy 5s + 3 Nhảy

        bot.chat('/spawn');

        await sleep(6000); 



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

        

        // Lùi xéo

        console.log('[Farm] Đang lùi xéo bằng phím A + S trong 0.5 giây...');

        bot.setControlState('back', true); 

        bot.setControlState('left', true); 

        await sleep(500); 

        bot.clearControlStates(); 



        await sleep(5000);

        bot.chat('/home');

        await sleep(6000); 

        bot.chat('/lay');

        

        console.log('[Farm] Đã đến bãi, nằm nghỉ!');



        // Anti AFK - Gõ Kit 20 phút/lần

        if (antiAfkLoop) clearInterval(antiAfkLoop);

        antiAfkLoop = setInterval(() => {

            if (botState === 'FARMING') {

                bot.chat('/kit tanthu');

                console.log('[Anti-AFK] Gõ kit giữ chỗ...');

            }

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
