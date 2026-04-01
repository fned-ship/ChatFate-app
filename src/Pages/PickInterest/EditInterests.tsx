import { useState } from 'react'
import './editinterestsstyle.css'
const EditInterests =()=>{
    const interests:Record<string,string[]>={
      "Gaming": [
        "poker",
        "bridge",
        "tabletop rpgs",
        "retro gaming",
        "speedrunning",
        "warhammer",
        "chess",
        "league of legends",
        "valorant",
        "minecraft",
        "poker",
        "dungeons & dragons",
        "esports",
        "cosplay",
        "board games"
    ],
    "Science": [
        "stargazing",
        "archaeology",
        "biology",
        "physics",
        "astronomy",
        "psychology"
    ],
    "Fitness": [
        "parkour",
        "pilates",
        "crossfit",
        "marathon running",
        "tai chi",
        "yoga",
        "gym"
    ],
    "Sports": [
        "mountain biking",
        "tennis",
        "golf",
        "badminton",
        "volleyball",
        "fencing",
        "rugby",
        "cricket",
        "formula 1",
        "motocross",
        "wrestling",
        "football",
        "basketball",
        "swimming",
        "surfing",
        "martial arts",
        "skateboarding"
    ],
    "Hobbies": [
        "vinyl records",
        "comic books",
        "lego building",
        "action figures",
        "stamp collecting",
        "antique restoration",
        "cardistry",
        "taxidermy"
    ],
    "Fashion": [
        "sneaker collecting",
        "vintage clothing"
    ],
    "Technology": [
        "virtual reality",
        "robotics",
        "drones",
        "3d printing",
        "game development",
        "data science",
        "iot",
        "ethical hacking",
        "cryptography",
        "javascript",
        "python",
        "artificial intelligence",
        "cybersecurity",
        "web development",
        "blockchain"
    ],
    "Design": [
        "ux design",
        "interior design"
    ],
    "Lifestyle": [
        "coffee brewing",
        "wine tasting",
        "veganism",
        "mixology",
        "bbq",
        "tea ceremony",
        "pastry art",
        "sushi making",
        "skincare",
        "survivalism",
        "minimalism",
        "cooking",
        "traveling",
        "gardening",
        "fashion",
        "baking"
    ],
    "Arts": [
        "theatre",
        "ballet",
        "calligraphy",
        "origami",
        "puppetry",
        "photography",
        "digital art",
        "painting",
        "dancing"
    ],
    "Entertainment": [
        "magic tricks",
        "true crime",
        "documentaries",
        "anime",
        "movies",
        "stand-up comedy"
    ],
    "Music": [
        "opera",
        "jazz",
        "hip hop",
        "k-pop",
        "guitar",
        "piano",
        "singing"
    ],
    "Media": [
        "blogging",
        "vlogging",
        "podcasts"
    ],
    "Wellness": [
        "mental health",
        "aromatherapy",
        "journaling",
        "meditation",
        "meditation"
    ],
    "Education": [
        "philosophy",
        "sociology",
        "economics",
        "linguistics",
        "genealogy",
        "public speaking",
        "history",
        "languages"
    ],
    "Social": [
        "politics",
        "human rights",
        "sustainability",
        "volunteering"
    ],
    
    "Crafts": [
        "woodworking",
        "knitting",
        "pottery",
        "sewing",
        "jewelry making",
        "blacksmithing"
    ],
    "Literature": [
        "writing",
        "reading"
    ],
    "Finance": [
        "investing",
        "crypto"
    ],
    "Outdoors": [
        "rock climbing",
        "camping",
        "bird watching",
        "fishing",
        "archery",
        "kayaking",
        "scuba diving",
        "urban exploration",
        "hiking"
    ]
}
const colors:Record<string,string>={
  'Gaming':'purple',
  'Technology':'blue',
  'Outdoors':'#184000',
  'Music':'#a73e0e'
}
 const [picked,setPicked]= useState<string[]>(['archery','python','javacript','chess','league of legends'])           

  return <div className="interestPage">
    <div className='heading1'>
    <span> Pick Your Interests </span>
    <span> (Minimum: 3, Maximum: 15)</span>
    </div>
    {Object.keys(interests).map((c)=>(
      c in colors ?
      <div className="cat" style={{background:"linear-gradient(transparent,"+colors[c ]+" 90%),url(\""+c+".jpg\")",backgroundPosition:'center center',backgroundRepeat:'no-repeat',backgroundSize:'cover'}}>
      {c}
      <div style={{display:'flex',flexWrap:'wrap',gap:'10px'}}>
        {
        interests[c].map((i)=>(<div className="intr" 
            style={{backgroundColor: picked.includes(i)?'green':'gray',border:picked.includes(i)?'1px solid white':'none'}} 
            onClick={()=>setPicked([...picked,i])}>{i}</div>))
        
    }</div>
    </div>:<div></div>
      

    ))}
    
    
  </div>

}
export default EditInterests