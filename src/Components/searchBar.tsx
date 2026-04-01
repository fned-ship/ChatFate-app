const SearchBar = ()=>{
    return(
        <div style={{height:'var(--baseFont)',width:"80%",alignSelf:'center',display:"flex",borderBottom:"1px solid white", paddingBottom:" calc(0.2 * var(--baseFont))",marginBottom: "calc(var(--baseFont) * 0.5 )"}}>
            <img src="searchIcon.png" style={{aspectRatio:"1/1",height:"100%",transform:"translateX(-50%)"}} alt="" />
            <input style={{flex:1,backgroundColor:"transparent",fontSize:"calc(0.55 * var(--baseFont))", color:"white"}} type="text" placeholder="Search..."/>

        </div>
    )

}

export default SearchBar