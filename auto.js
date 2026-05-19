const express = require('express');
const mineflayer = require('mineflayer');
const readline = require('readline'); // Kéo thêm module đọc bàn phím

const RECONNECT_DELAY = 300000; // 5 phút vào lại 1 lần 

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
        respawn: false // Giữ false để tự ấn bằng tay trong code
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
        if (!isLoggingIn) {
            isLoggingIn = true;
            console.log('[Hub] Đã vào server, chuẩn bị đăng nhập...');
            await sleep(2000);
            bot.chat('/l Windvu2193'); 
            console.log('[Hub] Đã gửi lệnh login! Đang dỏng tai nghe ngóng Server phản hồi...');
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

        // 2. SERVER BẢO TRÌ NÉM VỀ HUB -> NẰM CHỜ KÉO
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

        // 3. NHẬN DIỆN ĐÃ VÀO GAME -> BỎ QUA BƯỚC LA BÀN
        if (botState !== 'FARMING' && lowerMsg.includes('vừa tham gia máy chủ') && message.includes(bot.username)) {
            console.log(`[Mắt Thần] Đã thấy báo: ">>> ${bot.username} vừa tham gia máy chủ"! Bắt đầu chạy kịch bản múa...`);
            botState = 'FARMING'; 
            
            if (clickLoop) clearInterval(clickLoop);
            if (farmTimeout) clearTimeout(farmTimeout);
            
            farmTimeout = setTimeout(() => startFarmingProcess(bot), 3000);
        }

        // DỰ PHÒNG: NẾU THẤY CHAT CỦA GAME (TRƯỜNG HỢP KHÔNG CÓ DÒNG JOIN)
        if (botState === 'HUB' && (lowerMsg.includes('boss') || lowerMsg.includes('tài xỉu') || lowerMsg.includes('nô lệ') || lowerMsg.includes('thế giới') || lowerMsg.includes('thủ lĩnh'))) {
            console.log('[Mắt Thần] Nhận diện tin nhắn Game Farm! Bỏ qua La Bàn, tiến hành chạy bãi...');
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
        if (clickLoop) clearInterval(clickLoop);

        try {
            await sleep(3000); 
            console.log(`[Menu 1] Nhấp slot 20...`);
            await bot.clickWindow(20, 0, 0); 

            await sleep(2500); 
            console.log(`[Menu 2] Nhấp slot 14...`);
            await bot.clickWindow(14, 0, 0); 
            
            console.log('[Menu] Thành công! Đợi load map xác nhận...');
        } catch (err) {
            console.log('Lỗi click GUI:', err.message);
            botState = 'HUB'; 
        }
    });

    // ==========================================
    // SỰ KIỆN TỬ TRẬN: PHÂN BIỆT HUB VÀ FARM
    // ==========================================
    bot.on('death', async () => {
        isComboRunning = false; 
        bot.clearControlStates(); 
        if (antiAfkLoop) clearInterval(antiAfkLoop);
        if (clickLoop) clearInterval(clickLoop);
        if (farmTimeout) clearTimeout(farmTimeout);

        if (botState === 'HUB' || botState === 'WAIT_AUTO') {
            console.log('[CẢNH BÁO] Bot chết ở Sảnh (Hub)! Đang tự động ấn Hồi Sinh (Respawn)...');
            setTimeout(() => { bot.respawn(); }, 2000); 
        } else {
            console.log('[CẢNH BÁO] Bot bị giết trong cụm Farm! Nằm phơi xác không làm gì cả...');
        }
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
        await randomSleep(7000, 9000);

        // BAY ĐẾN BÃI TRƯỚC RỒI MỚI MÚA TAY
        bot.chat('/spawn');
        await randomSleep(5000, 7000); 

        // ==========================================
        // BƯỚC MỚI: LIA CHUỘT TRÁI 72 ĐỘ & PHI THÂN 2 PHÁT
        // ==========================================
        console.log('[Farm] Tới Spawn rồi, lia chuột 72 độ sang trái...');
        
        const currentYaw = bot.entity.yaw;
        const targetYaw = currentYaw + (72 * Math.PI / 180); 
        const currentPitch = bot.entity.pitch; 
        
        await bot.look(targetYaw, currentPitch, true); 
        await randomSleep(300, 500); 

        console.log('[Farm] Vận nội công W + Sprint + Space nhảy liên tiếp 2 phát...');
        
        // Bắt đầu đè ga chạy nhanh
        bot.setControlState('forward', true);
        bot.setControlState('sprint', true);
        
        // --- NHẢY PHÁT 1 ---
        bot.setControlState('jump', true); 
        await sleep(500); // Bay trên không 0.5s
        bot.setControlState('jump', false); // Nhả Space để tiếp đất
        
        // Khựng lại xíu cho nó chạm đất lấy đà (vẫn đang đè W chạy nhanh)
        await randomSleep(300, 400); 

        // --- NHẢY PHÁT 2 ---
        bot.setControlState('jump', true); // Đạp đất nảy lên phát 2
        await sleep(500); // Bay tiếp 0.5s
        bot.setControlState('jump', false); // Nhả Space ra
        
        // Giữ W + Sprint thêm 1 xíu để nó bay hết đà phát thứ 2 rơi xuống
        await randomSleep(600, 800); 
        
        // Phanh gấp bằng phanh ABS
        bot.clearControlStates(); 
        console.log('[Farm] Tiếp đất an toàn, đứng yên lấy hơi chuẩn bị múa...');

        await randomSleep(1500, 2000);

        // BẮT ĐẦU ĐÈ SHIFT VÀ MÚA TAY
        bot.setControlState('sneak', true); 
        await randomSleep(500, 600); 
        
        bot.swingArm('right'); 
        await randomSleep(600, 1000);
        bot.activateItem(); 
        await randomSleep(500, 600);
        bot.activateItem(); 
        await randomSleep(500, 600);
        bot.activateItem(); 
        await randomSleep(500, 600);

        // NHẢ SHIFT NGAY TẠI ĐÂY
        bot.setControlState('sneak', false); 
        bot.clearControlStates(); 
        await randomSleep(2000, 3000); 

        bot.setControlState('forward', true);
        await sleep(500); 
        bot.clearControlStates(); 
        await randomSleep(3000, 5000);
        
        bot.chat('/home'); // Xong combo thì bay về bãi Farm
        await randomSleep(10000, 12000); 
        
        // BƯỚC CUỐI CÙNG: NGỒI XUỐNG NHẬP ĐỊNH
        bot.chat('/sit');
        console.log('[Farm] Đã đến bãi, ngồi xuống nhập định (Tắt Auto Kit)!');

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
