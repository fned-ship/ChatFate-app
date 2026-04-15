import { useEffect, useState } from 'react'
import './editinterestsstyle.css'
const EditInterests =()=>{
    const [interests,setInterests]=useState([]) ;
    useEffect(()=>{fetch(import.meta.env.VITE_SERVER_URL+"/api/interests").then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json(); // Parses the body as JSON
  })
  .then(data =>{ setInterests(data) ; console.log(interests)})
  .catch(error => console.error('Fetch error:', error))},[])
    


    

const colors:Record<string,string>={
  'Gaming':'purple',
  'Technology':'blue',
  'Outdoors':'#184000',
  'Music':'#a73e0e'
}
 const [picked,setPicked]= useState<string[]>([])           

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
            onClick={()=>setPicked([...picked,i])}>{i.name}</div>))
        
    }</div>
    </div>:<div></div>
      

    ))}
    
    
  </div>

}
export default EditInterests