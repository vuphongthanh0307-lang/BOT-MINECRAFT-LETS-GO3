const express = require('express');
const mineflayer = require('mineflayer');
const readline = require('readline'); // Kéo thêm module đọc bàn phím

const RECONNECT_DELAY = 240000; // 4 phút vào lại 1 lần 

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
        checkTimeoutInterval: 120000,
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
        if (botState === 'HUB' && !isLoggingIn) {
            isLoggingIn = true;
            console.log('[Hub] Đã vào server, chuẩn bị đăng nhập...');
            await sleep(2000);
            bot.chat('/l Windvu2193'); 
            console.log('[Hub] Đã gửi lệnh login! Đang dỏng tai nghe ngóng Server phản hồi...');
        }
    });

    bot.on('messagestr', (message) => {
        const lowerMsg = message.toLowerCase();

        // ==========================================
        // MẮT THẦN V5: XỬ LÝ MỌI TÌNH HUỐNG
        // ==========================================
        
        // 1. NGHE ĐƯỢC CHỮ "BẠN SỞ HỮU" -> CHẮC CHẮN ĐANG Ở HUB
        if (botState === 'HUB' && lowerMsg.includes('bạn sở hữu')) {
            console.log('[Mắt Thần] Bắt được chữ "Bạn sở hữu"! Đích thị là đang ở Sảnh (Hub).');
            console.log('[Hub] Cầm La bàn lên tay và đục lỗ vô cụm...');
            
            bot.setQuickBarSlot(4); 
            
            let clickCount = 0;
            if (clickLoop) clearInterval(clickLoop);
            clickLoop = setInterval(() => {
                if (botState === 'HUB') {
                    console.log(`[Hub] Đang click La bàn...`);
                    bot.activateItem(); 
                    clickCount++;

                    // BẢO VỆ 2: Kẹt la bàn quá lâu thì ép Farm
                    if (clickCount >= 6) {
                        console.log('[Cứu Hộ] Click 15s không có Menu! Hủy vòng lặp, ép khởi động Farm...');
                        clearInterval(clickLoop);
                        botState = 'FARMING';
                        startFarmingProcess(bot);
                    }
                } else {
                    clearInterval(clickLoop);
                }
            }, 2500); 
        }

        // 2. CỨ VÀO ĐƯỢC GAME THÌ CHẠY LỆNH FARM (BẮT CẢ DÒNG JOIN LẪN CHAT BOSS ĐỂ DỰ PHÒNG)
        const hasJoinMessage = lowerMsg.includes('vừa tham gia máy chủ') && message.includes(bot.username);
        const hasGameMessage = lowerMsg.includes('boss') || lowerMsg.includes('tài xỉu') || lowerMsg.includes('nô lệ') || lowerMsg.includes('thế giới') || lowerMsg.includes('thủ lĩnh');
        
        if (botState !== 'FARMING' && (hasJoinMessage || hasGameMessage)) {
            console.log(`[Mắt Thần] Đã xác nhận lọt vào Game (Cụm Farm)! Bắt đầu chạy kịch bản múa...`);
            botState = 'FARMING'; 
            
            if (clickLoop) clearInterval(clickLoop);
            if (farmTimeout) clearTimeout(farmTimeout);
            
            farmTimeout = setTimeout(() => startFarmingProcess(bot), 3000);
        }

        // 3. SERVER BẢO TRÌ NÉM VỀ HUB -> NẰM CHỜ KÉO
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

        if (message.includes('không thể ngồi trong không khí') || message.includes('không thể nằm trong không khí')) {
            setTimeout(() => { if (botState === 'FARMING') bot.chat('/lay'); }, 3000);
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
        await randomSleep(100, 110);
        
        // BẮT ĐẦU ĐÈ SHIFT VÀ MÚA TAY NHANH
        bot.setControlState('sneak', true); 
        await sleep(200); 
        
        bot.swingArm('right'); 
        await randomSleep(100, 110);
        bot.activateItem(); 
        await randomSleep(100, 110);
        bot.activateItem(); 
        // Đã gỡ bỏ dấu ngoặc tròn gây lỗi Syntax Error ở đây nhé!
        await randomSleep(100, 110); 
        bot.activateItem(); 
        await randomSleep(100, 110);

        // NHẢ SHIFT NGAY TẠI ĐÂY
        bot.setControlState('sneak', false); 

        // BAY ĐẾN BÃI TRƯỚC RỒI MỚI MÚA TAY TIẾP THEO KỊCH BẢN MỚI CỦA ÔNG
        bot.chat('/spawn');
        await randomSleep(5000, 7000); 

        // ==========================================
        // BƯỚC MỚI: CHẠY THẲNG + SPRINT + NHẢY 3 PHÁT TRONG 5 GIÂY
        // ==========================================
        console.log('[Farm] Tới Spawn rồi, cắm đầu chạy thẳng 5 giây và nhảy 3 phát...');
        
        // Bắt đầu đè ga W và chạy nhanh (Sprint) thẳng tới trước
        bot.setControlState('forward', true);
        bot.setControlState('sprint', true);
        
        // --- NHẢY PHÁT 1 (Lúc bắt đầu) ---
        bot.setControlState('jump', true); 
        await sleep(400); // Bấm Space 0.4s
        bot.setControlState('jump', false); // Nhả Space
        
        await sleep(1100); // Chạy bộ lấy đà 1.1s

        // --- NHẢY PHÁT 2 ---
        bot.setControlState('jump', true); 
        await sleep(400); 
        bot.setControlState('jump', false); 
        
        await sleep(1100); // Chạy bộ lấy đà 1.1s

        // --- NHẢY PHÁT 3 ---
        bot.setControlState('jump', true); 
        await sleep(400); 
        bot.setControlState('jump', false); 
        
        // Chạy thêm nốt phần đà còn lại (1.6s) cho chẵn tổng thời gian 5 giây
        await sleep(1600); 

        // Phanh gấp, thả hết các nút ra
        bot.clearControlStates(); 
        console.log('[Farm] Đã chạy xong 5 giây, phanh lại đứng chờ...');
        
        // Đứng im đợi 10 - 11 giây trước khi xài lệnh /home
        await randomSleep(10000, 11000);
        
        bot.chat('/home'); // Xong combo thì bay về bãi Farm
        await randomSleep(5000, 6000); 
        
        // BƯỚC CUỐI CÙNG: NGỒI (NẰM) XUỐNG NHẬP ĐỊNH THEO Ý BRO MỚI ĐỔI
        bot.chat('/lay');
        console.log('[Farm] Đã đến bãi, nằm sải lai nhập định (Tắt Auto Kit)!');

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
