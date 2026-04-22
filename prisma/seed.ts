import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import path from 'path'

const adapter = new PrismaLibSql({ url: `file:${path.join(process.cwd(), 'dev.db')}` })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding database...')

  // Clear existing data
  await prisma.orderItemModifier.deleteMany()
  await prisma.orderItem.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.discount.deleteMany()
  await prisma.order.deleteMany()
  await prisma.modifier.deleteMany()
  await prisma.modifierGroup.deleteMany()
  await prisma.productVariant.deleteMany()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()
  await prisma.table.deleteMany()
  await prisma.staff.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.settings.deleteMany()

  // Categories
  const food = await prisma.category.create({
    data: {
      nameEn: 'Food',
      nameMy: 'အစားအသောက်',
      nameZh: '食物',
      nameTh: 'อาหาร',
      color: '#E85D04',
      sortOrder: 1,
    },
  })

  const drinks = await prisma.category.create({
    data: {
      nameEn: 'Drinks',
      nameMy: 'အချိုရည်',
      nameZh: '饮料',
      nameTh: 'เครื่องดื่ม',
      color: '#2563EB',
      sortOrder: 2,
    },
  })

  const desserts = await prisma.category.create({
    data: {
      nameEn: 'Desserts',
      nameMy: 'အချိုပွဲ',
      nameZh: '甜点',
      nameTh: 'ของหวาน',
      color: '#7C3AED',
      sortOrder: 3,
    },
  })

  const merchandise = await prisma.category.create({
    data: {
      nameEn: 'Merchandise',
      nameMy: 'ကုန်ပစ္စည်း',
      nameZh: '商品',
      nameTh: 'สินค้า',
      color: '#059669',
      sortOrder: 4,
    },
  })

  // Food Products
  await prisma.product.create({
    data: {
      sku: 'FOOD-001',
      nameEn: 'Pad Thai',
      nameMy: 'ပက်ထိုင်း',
      nameZh: '泰式炒河粉',
      nameTh: 'ผัดไทย',
      descriptionEn: 'Classic stir-fried rice noodles with egg, tofu, shrimp, bean sprouts and peanuts',
      descriptionMy: 'ဥ၊ တိုဟူး၊ ပုစွန်၊ ပဲဗောင်းနှင့် မြေပဲများနှင့်အတူ ကြော်ထားသော ဆန်ခေါက်ကြော်ထမင်းကောင်း',
      descriptionZh: '经典泰式炒河粉，配鸡蛋、豆腐、虾、豆芽和花生',
      descriptionTh: 'เส้นผัดไทยคลาสสิกกับไข่ เต้าหู้ กุ้ง ถั่วงอกและถั่วลิสง',
      price: 120,
      costPrice: 45,
      categoryId: food.id,
      isFavorite: true,
      vatMode: 'exclusive',
    },
  })

  await prisma.product.create({
    data: {
      sku: 'FOOD-002',
      nameEn: 'Green Curry',
      nameMy: 'စိမ်းရောင်ကရီး',
      nameZh: '青咖喱',
      nameTh: 'แกงเขียวหวาน',
      descriptionEn: 'Creamy green curry with coconut milk, vegetables and your choice of protein',
      descriptionMy: 'အုန်းနို့၊ ဟင်းသီးဟင်းရွက်နှင့် ပရိုတင်းရွေးချယ်မှုဖြင့် ချောမွေ့သော စိမ်းရောင်ကရီး',
      descriptionZh: '浓郁青咖喱配椰奶、蔬菜和您选择的蛋白质',
      descriptionTh: 'แกงเขียวหวานครีมกับกะทิ ผัก และโปรตีนที่คุณเลือก',
      price: 150,
      costPrice: 55,
      categoryId: food.id,
      isFavorite: true,
      vatMode: 'exclusive',
    },
  })

  await prisma.product.create({
    data: {
      sku: 'FOOD-003',
      nameEn: 'Tom Yum Soup',
      nameMy: 'တမ်ယမ်ဟင်းချို',
      nameZh: '冬阴功汤',
      nameTh: 'ต้มยำกุ้ง',
      descriptionEn: 'Spicy and sour Thai soup with shrimp, mushrooms, lemongrass and kaffir lime leaves',
      descriptionMy: 'ပုစွန်၊ မှိုများ၊ လဲမောန်ကျောင်းနှင့် ကော်ဖာထန်းသီးရွက်ပါ ချဉ်ပြင်း တမ်ယမ်ဟင်းချို',
      descriptionZh: '泰式酸辣汤，配虾、蘑菇、柠檬草和青柠叶',
      descriptionTh: 'ต้มยำกุ้งเผ็ดเปรี้ยว กุ้ง เห็ด ตะไคร้ ใบมะกรูด',
      price: 130,
      costPrice: 50,
      categoryId: food.id,
      isFavorite: true,
      vatMode: 'exclusive',
    },
  })

  await prisma.product.create({
    data: {
      sku: 'FOOD-004',
      nameEn: 'Spring Rolls',
      nameMy: 'နွေဦးလိပ်ကောင်',
      nameZh: '春卷',
      nameTh: 'ปอเปี๊ยะทอด',
      descriptionEn: 'Crispy fried spring rolls filled with vegetables and glass noodles, served with sweet chili sauce',
      descriptionMy: 'ဟင်းသီးဟင်းရွက်နှင့် ဖန်ဆုပ်ခေါက်ဆွဲပါ ကြော်ထားသော ကြောင်ငှက်ကောင် - ချိုမြိန်သော ငရုတ်ဆော်ဖြင့် ဆောင်ဆောင်',
      descriptionZh: '酥脆油炸春卷，馅料为蔬菜和粉丝，配甜辣酱',
      descriptionTh: 'ปอเปี๊ยะทอดกรอบใส้ผักและวุ้นเส้น เสิร์ฟพร้อมน้ำจิ้มหวาน',
      price: 80,
      costPrice: 25,
      categoryId: food.id,
      vatMode: 'exclusive',
    },
  })

  await prisma.product.create({
    data: {
      sku: 'FOOD-005',
      nameEn: 'Basil Chicken Rice',
      nameMy: 'ဘားဆယ်ကြက်ထမင်း',
      nameZh: '泰式打抛饭',
      nameTh: 'ข้าวผัดกะเพราไก่',
      descriptionEn: 'Stir-fried minced chicken with holy basil, chilies and garlic served over jasmine rice with fried egg',
      descriptionMy: 'ဂျက်စမင်းဆန်ထမင်းနှင့် ကြော်ဥများနှင့် ချစ်ဒေနက်ရိုးမွ (holy basil) ကြက်ငှက်ကြော်',
      descriptionZh: '泰式打抛鸡肉配茉莉香米饭和煎蛋',
      descriptionTh: 'ผัดกะเพราไก่สับกับใบกะเพรา พริก กระเทียม เสิร์ฟกับข้าวหอมมะลิและไข่ดาว',
      price: 110,
      costPrice: 40,
      categoryId: food.id,
      isFavorite: true,
      vatMode: 'exclusive',
    },
  })

  // Drinks Products
  await prisma.product.create({
    data: {
      sku: 'DRK-001',
      nameEn: 'Thai Milk Tea',
      nameMy: 'ထိုင်းနို့ရည်',
      nameZh: '泰式奶茶',
      nameTh: 'ชาไทย',
      descriptionEn: 'Classic Thai iced milk tea with condensed milk and evaporated milk over crushed ice',
      descriptionMy: 'ချောင်းပြတ်ရေခဲပေါ်တွင် ကောင်ဒင်ဆားနှင့် ငွေ့ပျော်နို့ပါ ထိုင်းနို့ဆောင်ဆောင်ရည်',
      descriptionZh: '经典泰式冰奶茶，加炼乳和淡奶，配碎冰',
      descriptionTh: 'ชาไทยเย็นคลาสสิกกับนมข้นและนมสด เสิร์ฟบนน้ำแข็งบด',
      price: 60,
      costPrice: 18,
      categoryId: drinks.id,
      isFavorite: true,
      vatMode: 'exclusive',
    },
  })

  await prisma.product.create({
    data: {
      sku: 'DRK-002',
      nameEn: 'Fresh Coconut',
      nameMy: 'အုန်းသစ်သီး',
      nameZh: '新鲜椰子',
      nameTh: 'มะพร้าวน้ำหอม',
      descriptionEn: 'Fresh young coconut served chilled with coconut meat',
      descriptionMy: 'အုန်းသားနှင့်အတူ ချမ်းသောအုန်းသစ်သီး',
      descriptionZh: '新鲜嫩椰子，配椰肉冷藏供应',
      descriptionTh: 'มะพร้าวน้ำหอมสดเย็นๆ พร้อมเนื้อมะพร้าวอ่อน',
      price: 70,
      costPrice: 30,
      categoryId: drinks.id,
      vatMode: 'exclusive',
    },
  })

  await prisma.product.create({
    data: {
      sku: 'DRK-003',
      nameEn: 'Lychee Juice',
      nameMy: 'လိုချီသီးဖျော်ရည်',
      nameZh: '荔枝汁',
      nameTh: 'น้ำลิ้นจี่',
      descriptionEn: 'Refreshing lychee juice with a hint of rose syrup, served over ice',
      descriptionMy: 'ရေခဲပေါ်တွင် နှင်းဆီဆီရပ်ဖြင့် လိုချီသီးဖျော်ရည်',
      descriptionZh: '清爽荔枝汁，带玫瑰糖浆，加冰块',
      descriptionTh: 'น้ำลิ้นจี่สดชื่นกับกลิ่นหอมน้ำกุหลาบ เสิร์ฟกับน้ำแข็ง',
      price: 55,
      costPrice: 15,
      categoryId: drinks.id,
      vatMode: 'exclusive',
    },
  })

  await prisma.product.create({
    data: {
      sku: 'DRK-004',
      nameEn: 'Thai Coffee',
      nameMy: 'ထိုင်းကော်ဖီ',
      nameZh: '泰式咖啡',
      nameTh: 'กาแฟโบราณ',
      descriptionEn: 'Traditional Thai coffee with sweetened condensed milk, strong and aromatic',
      descriptionMy: 'ကောင်ဒင်ဆားနို့ပါ ရိုးရာ ထိုင်းကော်ဖီ၊ ပြင်းထန်ပြီး ရနံ့မွေးသော',
      descriptionZh: '传统泰式咖啡配加糖炼乳，浓郁芳香',
      descriptionTh: 'กาแฟโบราณแบบไทยกับนมข้นหวาน เข้มข้นหอมกรุ่น',
      price: 50,
      costPrice: 15,
      categoryId: drinks.id,
      vatMode: 'exclusive',
    },
  })

  await prisma.product.create({
    data: {
      sku: 'DRK-005',
      nameEn: 'Mineral Water',
      nameMy: 'သတ္တုဓာတ်ရေ',
      nameZh: '矿泉水',
      nameTh: 'น้ำดื่ม',
      descriptionEn: 'Still mineral water 500ml',
      descriptionMy: '500ml သတ္တုဓာတ်ရေ',
      descriptionZh: '矿泉水 500ml',
      descriptionTh: 'น้ำดื่มบริสุทธิ์ 500ml',
      price: 20,
      costPrice: 5,
      categoryId: drinks.id,
      vatMode: 'exclusive',
    },
  })

  // Desserts Products
  await prisma.product.create({
    data: {
      sku: 'DSS-001',
      nameEn: 'Mango Sticky Rice',
      nameMy: 'သရက်သီးကပ်ကောင်ထမင်း',
      nameZh: '芒果糯米饭',
      nameTh: 'ข้าวเหนียวมะม่วง',
      descriptionEn: 'Sweet sticky rice topped with fresh ripe mango slices and drizzled with coconut cream',
      descriptionMy: 'အသင့်အတင့်ကောင်းသော သရက်သီးဖြတ်ပြားနှင့် အုန်းနို့ပေါ်တင်ထားသော ချိုမြိန်သော ကပ်ကောင်ထမင်း',
      descriptionZh: '甜糯米饭配新鲜熟芒果片，淋上椰奶',
      descriptionTh: 'ข้าวเหนียวหวานกับมะม่วงสุกสดๆ ราดด้วยกะทิ',
      price: 90,
      costPrice: 30,
      categoryId: desserts.id,
      isFavorite: true,
      vatMode: 'exclusive',
    },
  })

  await prisma.product.create({
    data: {
      sku: 'DSS-002',
      nameEn: 'Thai Ice Cream',
      nameMy: 'ထိုင်းရေခဲမုန့်',
      nameZh: '泰式冰淇淋',
      nameTh: 'ไอศกรีมไทย',
      descriptionEn: 'Rolled Thai ice cream with toppings of your choice: coconut, pandan, or taro flavor',
      descriptionMy: 'ကိုကိုနပ်၊ ပန်ဒန် သို့မဟုတ် တာရိုရသနှင့် ချောင်းလိပ်ထားသော ထိုင်းရေခဲမုန့်',
      descriptionZh: '泰式卷冰淇淋，可选椰子、班兰或芋头口味',
      descriptionTh: 'ไอศกรีมม้วนสไตล์ไทย เลือกท็อปปิ้งได้ รสมะพร้าว ใบเตย หรือเผือก',
      price: 75,
      costPrice: 25,
      categoryId: desserts.id,
      vatMode: 'exclusive',
    },
  })

  await prisma.product.create({
    data: {
      sku: 'DSS-003',
      nameEn: 'Sticky Rice Pudding',
      nameMy: 'ကပ်ကောင်ဖျော်ရည်ဂျယ်လီ',
      nameZh: '椰汁糯米布丁',
      nameTh: 'วุ้นกะทิข้าวเหนียว',
      descriptionEn: 'Creamy coconut sticky rice pudding served warm with caramel sauce',
      descriptionMy: 'ကာရမယ်ဆော်ဖြင့် နွေးနွေးဆောင်ဆောင် ချောမွေ့သော ကိုကိုနပ်ကပ်ကောင်ဂျယ်လီ',
      descriptionZh: '奶香椰汁糯米布丁，温热搭配焦糖酱',
      descriptionTh: 'ขนมวุ้นกะทิข้าวเหนียวครีมมี่ เสิร์ฟร้อนๆ พร้อมซอสคาราเมล',
      price: 65,
      costPrice: 20,
      categoryId: desserts.id,
      vatMode: 'exclusive',
    },
  })

  await prisma.product.create({
    data: {
      sku: 'DSS-004',
      nameEn: 'Banana Fritter',
      nameMy: 'ငှက်ပျောသီးကြော်',
      nameZh: '香蕉煎饼',
      nameTh: 'กล้วยทอด',
      descriptionEn: 'Crispy battered banana fritters served hot with honey and sesame seeds',
      descriptionMy: 'ပျားရည်နှင့် နှမ်းစေ့ပါ ပူပူနွေးနွေးဆောင်ဆောင် ကြော်ထားသော ငှက်ပျောသီးကြော်',
      descriptionZh: '酥脆炸香蕉配蜂蜜和芝麻',
      descriptionTh: 'กล้วยทอดกรอบร้อนๆ เสิร์ฟกับน้ำผึ้งและงา',
      price: 55,
      costPrice: 15,
      categoryId: desserts.id,
      vatMode: 'exclusive',
    },
  })

  await prisma.product.create({
    data: {
      sku: 'DSS-005',
      nameEn: 'Coconut Jelly',
      nameMy: 'အုန်းနို့ဂျယ်လီ',
      nameZh: '椰子果冻',
      nameTh: 'วุ้นมะพร้าว',
      descriptionEn: 'Refreshing coconut jelly dessert with sweet coconut water and tender coconut meat',
      descriptionMy: 'ချိုမြိန်သော အုန်းရေနှင့် ညင်သာသော အုန်းသားပါ ဆုပ်ဆိုသော အုန်းဂျယ်လီ',
      descriptionZh: '清爽椰子果冻，配甜椰子水和嫩椰肉',
      descriptionTh: 'วุ้นมะพร้าวสดชื่น กับน้ำมะพร้าวหวานและเนื้อมะพร้าวอ่อน',
      price: 60,
      costPrice: 18,
      categoryId: desserts.id,
      vatMode: 'exclusive',
    },
  })

  // Merchandise Products
  await prisma.product.create({
    data: {
      sku: 'MERCH-001',
      nameEn: 'BitePOS T-Shirt',
      nameMy: 'BitePOS တီရှပ်',
      nameZh: 'BitePOS T恤',
      nameTh: 'เสื้อยืด BitePOS',
      descriptionEn: 'Premium cotton BitePOS branded t-shirt. Available in S, M, L, XL',
      descriptionMy: 'BitePOS အမှတ်တံဆိပ် ပရီမီယံ ဖြူစင်တီရှပ်။ S, M, L, XL ဆိုင်ဇ်ရှိသည်',
      descriptionZh: 'BitePOS品牌高级棉T恤，提供S、M、L、XL尺码',
      descriptionTh: 'เสื้อยืดผ้าฝ้ายพรีเมียมแบรนด์ BitePOS มีไซส์ S M L XL',
      price: 350,
      costPrice: 120,
      categoryId: merchandise.id,
      trackStock: true,
      stockQty: 50,
      vatMode: 'exclusive',
    },
  })

  await prisma.product.create({
    data: {
      sku: 'MERCH-002',
      nameEn: 'Tote Bag',
      nameMy: 'တိုတ်အိတ်',
      nameZh: '手提袋',
      nameTh: 'กระเป๋าผ้า',
      descriptionEn: 'Eco-friendly BitePOS canvas tote bag with Thai motif design',
      descriptionMy: 'ထိုင်းပုံဒီဇိုင်းပါ BitePOS ပတ်ဝန်းကျင်နှင့်သဟဇာတဖြစ်သော ကင်းဗပ်အိတ်',
      descriptionZh: 'BitePOS环保帆布手提袋，泰式图案设计',
      descriptionTh: 'กระเป๋าผ้า BitePOS เป็นมิตรกับสิ่งแวดล้อม ลายไทย',
      price: 180,
      costPrice: 60,
      categoryId: merchandise.id,
      trackStock: true,
      stockQty: 30,
      vatMode: 'exclusive',
    },
  })

  await prisma.product.create({
    data: {
      sku: 'MERCH-003',
      nameEn: 'Sauce Bottle',
      nameMy: 'ဆော်ပုလင်း',
      nameZh: '酱料瓶',
      nameTh: 'ขวดซอส',
      descriptionEn: 'BitePOS signature sweet chili sauce 300ml bottle',
      descriptionMy: 'BitePOS လက်မှတ် ချိုမြင်သောငရုတ်ဆော် 300ml ပုလင်း',
      descriptionZh: 'BitePOS招牌甜辣酱300ml瓶装',
      descriptionTh: 'ซอสพริกหวาน BitePOS สูตรเด็ด ขนาด 300ml',
      price: 120,
      costPrice: 40,
      categoryId: merchandise.id,
      trackStock: true,
      stockQty: 80,
      vatMode: 'exclusive',
    },
  })

  await prisma.product.create({
    data: {
      sku: 'MERCH-004',
      nameEn: 'Chili Paste',
      nameMy: 'ငရုတ်ကောင်းကပ်',
      nameZh: '辣椒酱',
      nameTh: 'พริกแกง',
      descriptionEn: 'Homemade Thai chili paste (Nam Prik Pao) 200g jar, perfect for cooking',
      descriptionMy: 'အိမ်လုပ် ထိုင်းငရုတ်ကပ် (Nam Prik Pao) 200g ဘူး၊ ချက်ပြုတ်ခြင်းအတွက် အကောင်းဆုံး',
      descriptionZh: '自制泰式辣椒酱（Nam Prik Pao）200g罐装，适合烹饪',
      descriptionTh: 'น้ำพริกเผาโฮมเมดสูตรไทย 200g เหมาะสำหรับทำอาหาร',
      price: 90,
      costPrice: 30,
      categoryId: merchandise.id,
      trackStock: true,
      stockQty: 60,
      vatMode: 'exclusive',
    },
  })

  await prisma.product.create({
    data: {
      sku: 'MERCH-005',
      nameEn: 'Recipe Book',
      nameMy: 'ချက်ပြုတ်နည်းစာအုပ်',
      nameZh: '食谱书',
      nameTh: 'หนังสือสูตรอาหาร',
      descriptionEn: 'BitePOS authentic Thai recipes cookbook with 50 classic dishes in 4 languages',
      descriptionMy: '4 ဘာသာစကားဖြင့် ကလပ်ဆစ်ဟင်းလ်မျိုး 50 ပါ BitePOS စစ်မှန်သော ထိုင်းချက်ပြုတ်နည်းစာအုပ်',
      descriptionZh: 'BitePOS正宗泰式菜谱，收录50道经典菜肴，4种语言版本',
      descriptionTh: 'หนังสือสูตรอาหารไทยแท้ BitePOS 50 เมนูคลาสสิกใน 4 ภาษา',
      price: 250,
      costPrice: 80,
      categoryId: merchandise.id,
      trackStock: true,
      stockQty: 25,
      vatMode: 'exclusive',
    },
  })

  // Staff
  await prisma.staff.create({
    data: {
      name: 'Somchai',
      email: 'somchai@bitepos.com',
      pin: '1111',
      role: 'cashier',
    },
  })

  await prisma.staff.create({
    data: {
      name: 'Malee',
      email: 'malee@bitepos.com',
      pin: '2222',
      role: 'manager',
    },
  })

  // Tables
  const tableData = [
    { name: 'T01', section: 'Main', seats: 2, posX: 50, posY: 50 },
    { name: 'T02', section: 'Main', seats: 2, posX: 180, posY: 50 },
    { name: 'T03', section: 'Main', seats: 4, posX: 310, posY: 50 },
    { name: 'T04', section: 'Main', seats: 4, posX: 50, posY: 180 },
    { name: 'T05', section: 'Main', seats: 4, posX: 180, posY: 180 },
    { name: 'T06', section: 'Main', seats: 6, posX: 310, posY: 180 },
    { name: 'T07', section: 'Outdoor', seats: 2, posX: 50, posY: 50 },
    { name: 'T08', section: 'Outdoor', seats: 2, posX: 180, posY: 50 },
    { name: 'T09', section: 'Outdoor', seats: 4, posX: 310, posY: 50 },
    { name: 'T10', section: 'Private', seats: 8, posX: 50, posY: 50 },
  ]

  for (const table of tableData) {
    await prisma.table.create({ data: table })
  }

  // Default Settings
  const settings = [
    { key: 'shopName', value: 'BitePOS Restaurant' },
    { key: 'shopNameTh', value: 'ร้านอาหารไทยไบท์' },
    { key: 'shopNameMy', value: 'BitePOS စားသောက်ဆိုင်' },
    { key: 'shopNameZh', value: 'BitePOS餐厅' },
    { key: 'taxRate', value: '7' },
    { key: 'vatMode', value: 'exclusive' },
    { key: 'currency', value: 'THB' },
    { key: 'currencySymbol', value: '฿' },
    { key: 'defaultLocale', value: 'en' },
    { key: 'receiptFooter', value: 'Thank you for dining with us! | ขอบคุณที่มาใช้บริการ' },
    { key: 'loyaltyPointsRate', value: '10' },
    { key: 'loyaltyRedeemRate', value: '100' },
    { key: 'printerEnabled', value: 'false' },
    { key: 'printerType', value: 'thermal' },
    { key: 'serviceCharge', value: '0' },
    { key: 'openTime', value: '10:00' },
    { key: 'closeTime', value: '22:00' },
    { key: 'address', value: '123 Thai Street, Bangkok 10110' },
    { key: 'phone', value: '+66 2 123 4567' },
    { key: 'taxId', value: '0123456789012' },
  ]

  for (const setting of settings) {
    await prisma.settings.create({ data: setting })
  }

  console.log('Seeding complete!')
  console.log('- 4 categories created')
  console.log('- 20 products created')
  console.log('- 2 staff created (Somchai PIN: 1111, Malee PIN: 2222)')
  console.log('- 10 tables created')
  console.log('- Default settings created')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
