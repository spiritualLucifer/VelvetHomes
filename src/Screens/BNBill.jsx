import React, { useState,useEffect } from 'react'
import { useNavigate, useParams } from "react-router-dom";
import "../stylesheets/BNBill.css"
import CustomerNavBar from '../Components/CustomerNavBar'

export default function BNBill() {
    const navigate = useNavigate();
    const { id } = useParams();
    const [element,setElement] = useState({
        title: "",
        price: 0,
        quantity: 0,
        images: ""
    });
    const [qty,setQty] = useState(1);
    const [show,setShow] = useState(false);
    const [discount, setDiscount] = useState(1);
    const [showDc,setShowDc] = useState(false);
    const [message,setMessage] = useState("This is a test message");
    const [code,setCode] = useState("");
    const applyCode = async () => {
      if(code.length==0){
        setShowDc(true);
        setMessage("Please Enter Code To Be Applied")
      }else{
        const response = await fetch(
          "http://localhost:5000/velvethomes/customer/validcode",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              code: code,
              username: localStorage.getItem("customerUsername"),
            }),
          }
        );
        const json = await response.json();
        if(json.success){
          setShowDc(true);
          setMessage(json.message);
          setDiscount(parseInt(json.discountpercent))
        }else{
          setShowDc(true);
          setMessage(json.message)
        }
      }
    }
    const placeOrder = async function(){
      const response = await fetch(
        "http://localhost:5000/velvethomes/customer/placeorder",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: id,
            username: localStorage.getItem("customerUsername"),
            quantity: qty,
            discount: discount,
            couponcode: discount===1 ? "none" : code
          }),
        }
      );
      const json= await response.json();
      if(json.status){
        navigate("/velvethomes/pinfo")
      }else{
        alert(json.message)
      }
    }
    const fetchData = async function () {
        const response = await fetch(
          "http://localhost:5000/velvethomes/customer/productdetails",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              oid: id,
            }),
          }
        );
        const json = await response.json();
        if (json.success) {
          setElement({
            title: json.object.title,
            price: json.object.price,
            quantity: json.object.quantity,
            images: json.object.images[0]
          })
        }
    };
    useEffect(() => {
        fetchData();
    }, []);
    const handleChange = (e)=>{
        if(e.target.value>element.quantity){
            setShow(true);
            setQty(element.quantity)
        }else{
            setShow(false);
            setQty(e.target.value)
            if(e.target.value<0) setQty(0)
        }
    }
  return (
    <div className='BNB-main'>
      <CustomerNavBar />
      <div className="BNB-head">
        <div className="BNB-head-s">Sr. No.</div>
        <div className="BNB-head-p">Product</div>
        <div className="BNB-head-r">Rate (in Rs.)</div>
        <div className="BNB-head-r">Quantity</div>
        <div className="BNB-head-r">Total</div>
      </div>
      <div className="BNB-body">
        <div className="BNB-body-s">1.</div>
        <div className="BNB-body-p">
            <img src={element.images} className="BNB-body-p-img" alt="" />
            <div className="BNB-body-p-title">{element.title}</div>
        </div>
        <div className="BNB-body-r">{element.price}/-</div>
        <div className="BNB-body-r BNB-body-in">
            <input type="number" className='BNB-body-r-input' value={qty} onChange={handleChange} name="" id="" />
            {show && <div className='BNB-alert'>**Only {element.quantity} Units Available..</div>}
        </div>
        <div className="BNB-body-r">{qty*element.price}/-</div>
      </div>
      <div className="BNB-total">
        <div className="BNB-total-head">Discount :- </div>
        <div className="BNB-total-value">{discount} %</div>
      </div>
      <div className="BNB-total">
        <div className="BNB-total-head">SubTotal :- </div>
        <div className="BNB-total-value">Rs. {qty*element.price}/-</div>
      </div>
      <div className="BNB-total">
        <div className="BNB-total-head">Discount Amount :- </div>
        <div className="BNB-total-value"> - Rs. {Math.ceil((discount)*qty*element.price/100)}/-</div>
      </div>
      <div className="BNB-total">
        <div className="BNB-total-head">Total :- </div>
        <div className="BNB-total-value">Rs. {Math.floor((100-discount)*qty*element.price/100)}/-</div>
      </div>
      <div className="BNB-btn-con">
        <input type="text" className='BNBdc' value={code} onChange={(evt)=>{setShowDc(false); setDiscount(1); setCode(evt.target.value)}} placeholder='enter discount code' />
        <div className="BNBdcsearch" onClick={applyCode}>Check</div>
      </div>
        {
          showDc && <div className="coupon-code-messag" style={{textAlign: 'right'}}>**{message}</div>
        }
      <div className="BNB-btn-con">
        <div className="BNB-btn" onClick={placeOrder}>Place Order</div>
      </div>
    </div>
  )
}
