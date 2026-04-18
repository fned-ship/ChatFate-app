import { useEffect, useState } from 'react'
import './editinterestsstyle.css'
import Cookies from 'js-cookie';
import api from '../../services/api';
const EditInterests =()=>{
    const [interests,setInterests]=useState([]) ;
    const [loading,setLoading]=useState(true)
    useEffect(()=>{fetch(import.meta.env.VITE_SERVER_URL+"/api/interests").then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json(); // Parses the body as JSON
  })
  .then(data =>{ setInterests(data) ; console.log(data);setLoading(false)})
  .catch(error => {console.error('Fetch error:', error);setLoading(false)})},[])
    


    

const colors:Record<string,string>={
  'Gaming':'purple',
  'Technology':'blue',
  'Outdoors':'#184000',
  'Music':'#a73e0e',
  'Arts':'#5a2913',
  'Entertainment':'#1c5123',
  'Crafts':'#511c32',
  'Design':'#56554e',
  'Fashion':'rgb(33 77 83)',
  'Finance':'rgb(79 81 92)',
  'Lifestyle':'rgb(160 112 87)',
  'Literature':'#5f3620',
  'Media':'rgb(17 27 58)',
  'Wellness':'rgb(87 160 133)',
  'Sports':'rgb(17 55 31)',
  'Science':'rgb(19 27 53)',
  'Hobbies':'red',
  'Social':'#ff8e3f',
  'Fitness':'blue',
  'Education':'green'

}
const [picked, setPicked] = useState<string[]>(() => {
  try {
    const userCookie = Cookies.get('user');
    // Check if cookie exists to avoid parsing errors
    if (userCookie) {
      return JSON.parse(userCookie).interests.map((i: any) => i._id);
    }
  } catch (error) {
    console.error("Failed to parse user cookie", error);
  }
  return []; // Return default empty array if error or no cookie
}); 

 const [isLoading, setIsLoading] = useState(false);
   const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  return <div className="interestPage">
    <div className='heading1'>
    <span> Pick Your Interests </span>
    <span> (Minimum: 3, Maximum: 15)</span>
    
    </div>
    {loading && <span style={{textAlign:'center',color:'gray',fontSize:12,fontFamily:'Ultra'}}>Loading data...</span>}
    {Object.keys(interests).map((c)=>(
      <div className="cat" style={{background:"linear-gradient(transparent,"+colors[c ]+" 90%),url(\"/"+c+".jpg\")",backgroundPosition:'center center',backgroundRepeat:'no-repeat',backgroundSize:'cover'}}>
      {c}
      <div style={{display:'flex',flexWrap:'wrap',gap:'10px'}}>
        {
        interests[c].map((i)=>(<div className="intr" 
            style={{backgroundColor: picked.includes(i.id)?'green':'gray',border:picked.includes(i.id)?'1px solid white':'1px solid gray'}} 
            onClick={(e)=>{ 
                if (picked.includes(i.id)){
                    setPicked(prev => prev.filter((index) => index != i.id))
                }
                else if (picked.length<15){
setPicked([...picked,i.id]);console.log([...picked,i.id])
            }else{
               const target = e.target as HTMLElement;
  target.classList.add('shake');
  setTimeout(() => {
  target.classList.remove('shake');
}, 1000);
            }
                }}>{i.name}</div>))
        
    }</div>
    </div>
      

    ))}

    <button className='submit-button' style={{alignSelf:'center',margin:'10px'}} disabled={isLoading}
    onClick={async ()=>{

        if(picked.length<3){
            setMessage({ type: 'error', text: 'Minimum of 3 interests need to be picked.' });
        }else{
            setIsLoading(true)
            try{
                await api.put('/api/profile/interests',{interests:picked});
                setMessage({ type: 'success', text: 'Profile updated successfully!' });
                Cookies.set('user',   JSON.stringify({...JSON.parse(Cookies.get('user')),interests:picked}),{ expires: 7 });
            } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Failed to update interests. Please try again.' });
    } finally {
      setIsLoading(false);
    }
            
        }

    }}
    
    >{isLoading ? 'Saving...' : 'Save Changes'}</button>
    
    {message && (
        <div className={`alert-message ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          {message.text}
        </div>
      )}
  </div>

}
export default EditInterests