import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { topic, tone = "promotional", language = "hinglish", businessName = "Our Business" } = body;

    if (!topic || !topic.trim()) {
      return NextResponse.json(
        { success: false, error: "Kripya post ka topic ya offer enter karein!" },
        { status: 400 }
      );
    }

    const cleanTopic = topic.trim();

    // AI Generation Engine with multiple contextual variations
    const variations = [];

    if (tone === "promotional") {
      variations.push({
        id: "var_1",
        label: "🔥 High-Conversion Sales Offer",
        badge: "Best for Instagram & Facebook",
        text: `🔥 GRAND SALE ALERT! 🔥\n\nAb paayein sabse bada discount ${cleanTopic}! 🛍️✨\n\nKyunki ye offer baar baar nahi aata, isliye abhi apna order confirm karein aur exclusive deal ka fayda uthayein. Limited stock available hai! ⏳\n\n📲 Order karne ke liye abhi WhatsApp karein ya DM me message karein.\n\n#SpecialOffer #GrandDiscount #MegaSale #LimitedPeriod #ShopNow #ExclusiveDeal #TrendingInIndia`,
      });

      variations.push({
        id: "var_2",
        label: "🎁 Festive & Customer Delight",
        badge: "Best for WhatsApp Status & Story",
        text: `🎉 Khushiyon ka season, zabardast offers ke saath! 🎁✨\n\n${businessName} lekar aaya hai aapke liye vishesh deal: ${cleanTopic}.\n\nAapke aur aapke parivaar ke liye best quality guaranteed. Aaj hi shop karein aur festive celebration ko banayein aur bhi special! 🌟\n\n👉 Contact us on WhatsApp to get VIP coupon code!\n\n#FestiveSeason #CelebrationDeal #BestQuality #CustomerFirst #FestivalVibes #SaveBig`,
      });

      variations.push({
        id: "var_3",
        label: "⚡ Short, Punchy & Urgent",
        badge: "Best for Twitter/X & Quick Broadcast",
        text: `⚡ FLASH OFFER: ${cleanTopic}! ⏳\n\nSirf agle 24 ghante ke liye valid! Stock tezi se khatam ho raha hai. Miss mat kijiye! 🚀\n\n👉 WhatsApp us now: Order link in bio!\n\n#FlashSale #DealOfTheDay #DontMissOut #Trending`,
      });
    } else if (tone === "professional") {
      variations.push({
        id: "var_1",
        label: "💼 Corporate Growth & Thought Leadership",
        badge: "Best for LinkedIn & Facebook Page",
        text: `Driving impactful growth and delivering excellence in every step. 🚀\n\nWe are excited to share our latest milestone regarding ${cleanTopic}. At ${businessName}, our primary mission remains consistent: delivering measurable value and exceptional reliability to our clients and partners.\n\nWhat are your thoughts on this? Let's connect in the comments below!\n\n#BusinessGrowth #Innovation #Leadership #Excellence #IndustryTrends #B2B`,
      });

      variations.push({
        id: "var_2",
        label: "📈 Industry Update & Solutions",
        badge: "Best for LinkedIn Article / Update",
        text: `Navigating the modern market requires speed, quality, and commitment. 📊\n\nHere is how we are solving key challenges with ${cleanTopic}. Discover streamlined solutions designed to help your enterprise scale efficiently.\n\nDM our team or visit our official page to schedule a discovery call today.\n\n#CorporateSolutions #Efficiency #EnterpriseScale #BusinessStrategy`,
      });

      variations.push({
        id: "var_3",
        label: "🤝 Professional Announcement",
        badge: "Best for Company Showcase",
        text: `Announcement: Introducing our latest initiative around ${cleanTopic}. 🎯\n\nCommitted to empowering clients with superior standards. Reach out directly to collaborate with ${businessName}.\n\n#Partnership #NewInitiative #CorporateUpdate`,
      });
    } else if (tone === "festive") {
      variations.push({
        id: "var_1",
        label: "🪔 Festive Greetings & Joy",
        badge: "Best for WhatsApp & Instagram",
        text: `🪔 Tyohaar ke is paavan avsar par, aapko aur aapke parivaar ko dher saari shubhkaamnayein! ✨🙏\n\nKhushiyon ko dugna karne ke liye ${businessName} laya hai: ${cleanTopic}! 🎁\n\nIs tyohaar ko banayein aur bhi yaadgaar hamare special offers ke saath. Happy Celebrations!\n\n#HappyFestivals #Shubhkaamnayein #CelebrationTime #FamilyVibes #TyohaarDeals`,
      });

      variations.push({
        id: "var_2",
        label: "🌺 Blessings & Special Treats",
        badge: "Best for Status & Stories",
        text: `🌺 Sukhad aur mangalmay tyohaar ki haardik shubhkaamnayein! 🌸\n\nKhushiyan baantne ke liye hum lekar aaye hain: ${cleanTopic}.\n\nAaj hi checkout karein aur paayein exclusive festive hampers!\n\n#FestiveGreetings #SpecialCelebration #JoyAndHappiness`,
      });

      variations.push({
        id: "var_3",
        label: "🎉 Festive Quick Wish",
        badge: "Best for Twitter/X & Status",
        text: `Warm festive greetings to everyone! 🪔 Celebrate with our special edition on ${cleanTopic}. Wishing you prosperity & success!\n\n#FestiveVibes #Joy #Celebration`,
      });
    } else {
      // Engaging / Casual
      variations.push({
        id: "var_1",
        label: "💡 Question & Community Engagement",
        badge: "Best for High Comments & Shares",
        text: `Hey everyone! 👋 Quick question for all of you:\n\nKaise laga aapko hamara latest update about ${cleanTopic}? 🤔💭\n\nNiche comments me bataiye aapki kya ray hai! Sabse best comment ko milega ek surprise voucher hamari taraf se! 🎁👇\n\n#CommunityLove #CustomerFeedback #InteractivePost #TellUsBelow #WhatsYourThought`,
      });

      variations.push({
        id: "var_2",
        label: "📸 Behind-The-Scenes & Storytelling",
        badge: "Best for Instagram Reels & Feed",
        text: `Kuch naya aur exciting ban raha tha, aur ab finally ready hai! 🎬✨\n\nCheck out: ${cleanTopic}! Kafi mehnat ke baad hum ye aapke samne laaye hain. Hope aap sabko bohot pasand aayega. 💖\n\nDouble tap karein agar aap bhi excited hain! ❤️\n\n#BehindTheScenes #NewDrop #ExcitingNews #MustTry #ViralPost`,
      });

      variations.push({
        id: "var_3",
        label: "⚡ Catchy & Fun",
        badge: "Best for X (Twitter) & Broadcast",
        text: `Can't keep calm because ${cleanTopic} is here! 🥳🔥 Drop an emoji in the replies if you are loving this vibe! ✨\n\n#WeekendVibes #TrendingNow #GoodVibesOnly`,
      });
    }

    return NextResponse.json({
      success: true,
      topic: cleanTopic,
      tone,
      language,
      variations,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
