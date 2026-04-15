import { useEffect, useState } from 'react'
import './editinterestsstyle.css'
import Cookies from 'js-cookie';
const EditInterests =()=>{
    const [interests,setInterests]=useState([]) ;
    useEffect(()=>{fetch(import.meta.env.VITE_SERVER_URL+"/api/interests").then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json(); // Parses the body as JSON
  })
  .then(data =>{ setInterests(data) ; console.log(data)})
  .catch(error => console.error('Fetch error:', error))},[])
    


    

const colors:Record<string,string>={
  'Gaming':'purple',
  'Technology':'blue',
  'Outdoors':'#184000',
  'Music':'#a73e0e'
}
 const [picked,setPicked]= useState<string[]>(JSON.parse(Cookies.get('user') ).interests.map(i=>i._id))          

  return <div className="interestPage">
    <div className='heading1'>
    <span> Pick Your Interests </span>
    <span> (Minimum: 3, Maximum: 15)</span>
    </div>
    {Object.keys(interests).map((c)=>(
      c in colors ?
      <div className="cat" style={{background:"linear-gradient(transparent,"+colors[c ]+" 90%),url(\"/"+c+".jpg\")",backgroundPosition:'center center',backgroundRepeat:'no-repeat',backgroundSize:'cover'}}>
      {c}
      <div style={{display:'flex',flexWrap:'wrap',gap:'10px'}}>
        {
        interests[c].map((i)=>(<div className="intr" 
            style={{backgroundColor: picked.includes(i.id)?'green':'gray',border:picked.includes(i.id)?'1px solid white':'1px solid gray'}} 
            onClick={()=>{setPicked([...picked,i.id]);console.log([...picked,i.id])}}>{i.name}</div>))
        
    }</div>
    </div>:<div></div>
      

    ))}
    
    
  </div>

}
export default EditInterests