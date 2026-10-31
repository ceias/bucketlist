const plans = [
 ['2026-11','Matching Era','Buy matching clothes|Choose coordinated colors|Prepare for December’s matching outfit date|Start a shared date savings fund'],
 ['2026-12','BGC Food Crawl','Wear matching outfits|Visit Go Bento|Visit Pound x Flatterie|Visit TGI Friday’s|Rate the restaurants|Take pictures'],
 ['2027-01','Makati Adventure','Try Korean barbecue|Visit a food hall|Try dessert somewhere new|Prepare anniversary outfits|Prepare anniversary letters and gifts'],
 ['2027-02','First Anniversary','Wear anniversary outfits|Do one memorable activity|Have a special meal|Take anniversary pictures|Exchange 13 meaningful notes|Create a time capsule'],
 ['2027-03','Arcade Rivals','Visit an arcade|Play five games|Compete for points|Let the winner choose dinner|Save a souvenir'],
 ['2027-04','Manila Explorers','Visit Intramuros|Try biking|Visit Binondo|Try Chinese restaurants|Take historical photographs'],
 ['2027-05','₱500 Surprise Challenge','Each partner prepares a surprise mini-date|Stay within the agreed budget|Include an affordable activity|Exchange a handwritten note'],
 ['2027-06','Rainy-Day Comfort','Indoor movie date|Exchange favorite snacks|Build a relationship playlist|Play a game together'],
 ['2027-07','Something New','Try bowling, skating, or an escape room|Take pictures|Record your experience'],
 ['2027-08','Little Explorers','Discover an unfamiliar neighborhood|Try new cafés|Visit two food spots|Collect a souvenir'],
 ['2027-09','Then & Now','Revisit an important location|Recreate an old couple photograph|Print favorite pictures|Create a scrapbook'],
 ['2027-10','Our Story Celebration','Plan a surprise date|Review completed goals|Choose favorite memories|Prepare another year of adventures']
];
export const missionSeeds=plans.flatMap(([month,theme,items])=>items.split('|').map(title=>({kind:'bucket',title,body:theme,date:month+'-01',category:'Monthly goals',amount:0,done:false,private:false,data:{}})));
export const monthThemes=Object.fromEntries(plans.map(([m,t])=>[m,t]));
