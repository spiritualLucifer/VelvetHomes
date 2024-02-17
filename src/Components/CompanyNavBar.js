import React from 'react'
import "../stylesheets/CompanyNavBar.css"
import logo from "../Components/logo.jpeg"
import { useNavigate } from 'react-router-dom'
import { logout } from '../features/login/loginSlice'
import { useDispatch } from 'react-redux'

export default function CompanyNavBar({ navTitle }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const redirectTo = (s) => {
    navigate(s);
  }
  const handleLogout = ()=>{
    dispatch(logout());
  }
  return (
    <div className="cm-nav">
      <div className="comp-nav-head">
        <img src={logo} alt="" />
        <div className="comp-nav-head-item">
          Velvet Homes
        </div>
      </div>
      <div className={navTitle === "Home" ? "comp-nav-item comp-nav-item-selected" : "comp-nav-item"} onClick={() => redirectTo("/velvethomes/seller/home")}>Home</div>
      {/* <div className={navTitle === "Track Sales" ? "comp-nav-item comp-nav-item-selected" : "comp-nav-item"} >Track Sales</div> */}
      <div className={navTitle === "Allprod" ? "comp-nav-item comp-nav-item-selected" : "comp-nav-item"} onClick={()=>redirectTo("/velvethomes/seller/allproducts")}>All Products</div>
      <div className={navTitle === "Newprod" ? "comp-nav-item comp-nav-item-selected" : "comp-nav-item"} onClick={()=>redirectTo("/velvethomes/seller/newproduct")}>Add Product</div>
      <img src="https://www.diviana.in/wp-content/uploads/2020/09/Top-5-Tips-to-Luxury-Home-Interiors-01.jpg" className='CompNavImg' alt="" />
      <div className="comp-nav-item comp-nav-logout" onClick={handleLogout}>Logout</div>
    </div>
  )
}
