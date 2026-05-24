const express = require('express');
const mineflayer = require('mineflayer');
const readline = require('readline'); 

const RECONNECT_DELAY = 300000; 

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
        username: 'Fonggggg', 
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
            bot.chat('/dn Windvu@2_1_9_30849009630'); 
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

async function startFarmingProcess(bot) {
    if (isComboRunning) return; 
    isComboRunning = true;

    try {
        bot.setQuickBarSlot(0); 
        await sleep(55000);
        
        // BAY ĐẾN BÃI TRƯỚC RỒI MỚI MÚA TAY
        bot.chat('/spawn');
        await randomSleep(8000, 10000); 

        // ==========================================
        // BƯỚC MỚI: ĐI NGANG 1S -> LIA CHUỘT XÉO TRÁI -> NHẢY TIẾN 1S
        // ==========================================
        console.log('[Farm] Tới Spawn, bước sang ngang 1 giây né đám đông...');
        
        bot.setControlState('right', true); 
        await randomSleep(1000, 1100); 
        
        bot.clearControlStates(); // Dừng bước ngang
        await sleep(300); // Khựng lại lấy đà 1 nhịp ngắn

        console.log('[Farm] Lia chuột xéo trái 45 độ và nhảy tới 1 giây...');
        
        // Lấy góc nhìn hiện tại cộng thêm 45 độ (Radian) để xoay đầu
        const currentYaw = bot.entity.yaw;
        const targetYaw = currentYaw + (45 * Math.PI / 180); 
        const currentPitch = bot.entity.pitch; 
        
        // Xoay đầu cái rụp theo hướng 45 độ
        await bot.look(targetYaw, currentPitch, true); 
        await sleep(200); // Trì hoãn 0.2s cho camera xoay xong mượt mà
        
        // Vận công Nhảy + Chạy nhanh + Đi tới (Vì đã quay đầu nên W chính là xéo trái)
        bot.setControlState('forward', true); 
        bot.setControlState('sprint', true); 
        bot.setControlState('jump', true); 

        // Cho nó bay trên không đúng 1 giây
        await randomSleep(1000, 1200); 
        
        // Phanh gấp ABS
        bot.clearControlStates(); 
        console.log('[Farm] Tiếp đất mượt mà, đứng yên lấy hơi chuẩn bị múa...');
        await randomSleep(500, 800);
        
        bot.setControlState('sneak', true); 
        await randomSleep(500, 600); 
        
        bot.swingArm('right'); 
        await randomSleep(500, 600);
        bot.activateItem(); 
        await randomSleep(500, 600);
        bot.activateItem(); 
        await randomSleep(500, 600);
        bot.activateItem(); 
        await randomSleep(500, 600);

        bot.setControlState('sneak', false); 

        await randomSleep(4000, 10000); 
        bot.setControlState('forward', true); 
        await sleep(500);
        bot.clearControlStates(); 
        await sleep(6000); 

        bot.chat('/home'); 
        await randomSleep(10000, 12000); 
        
        console.log('[Farm] Đã load map bãi farm, chuẩn bị nhích bước tới...');
        bot.clearControlStates(); 
        //
        console.log('[Farm] Đang lùi xéo bằng phím D + S trong 0.5 giây...');
        bot.setControlState('forward', true);  // Đè phím S
        bot.setControlState('right', true); // Đè phím D
        
        await sleep(200); // Giữ đúng 0.5 giây
        bot.clearControlStates(); // Nhả cả 2 phím ra để phanh lại
        await sleep(200); // Đứng yên 0.2s lấy thăng bằng
        ;;
        await sleep(8000);
        bot.chat('/sit');

        // ==========================================
        // 1. HẠ CHUỘT XUỐNG MỘT TÍ (Khoảng 20 độ)
        // Đã đổi tên biến thành finalYaw, finalPitch để không bị Crash Node.js
        // ==========================================
        const finalYaw = bot.entity.yaw;
        const finalPitch = bot.entity.pitch - (20 * Math.PI / 180); 
        
        await bot.look(finalYaw, finalPitch, true); 
        await sleep(300);
        //////////////////////////////////
        console.log('[Farm] Đã nhích đúng vị trí, ngồi xuống nhập định (Tắt Auto Kit)!');
        failCount = 0; 

        // XÓA BỎ HOÀN TOÀN AUTO KIT
        if (antiAfkLoop) {
            clearInterval(antiAfkLoop);
            antiAfkLoop = null; 
        }


        
    } catch (err) {
        console.log('[Farm] Lỗi:', err.message);
    } finally {
        isComboRunning = false; 
    }
}

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
