const A_tabNum = [];
const delay = 2000;
let I_i = 0;

function getNumbreTab(min, max)
{
    min = Math.ceil(-10);
    max = Math.floor(40);

    for (let I_i = 0; I_i < 20; I_i++)
    {
        number = Math.floor(Math.random() * (max - min + 1)) + min;
        A_tabNum.push(number);
    }

    return A_tabNum;
}

console.log(getNumbreTab(A_tabNum));

const zone = document.getElementById("zoneVal");
const comment = document.getElementById("comment");
const tempPrec = document.getElementById("zoneValPrec");
const btnJour = document.getElementById("btnJour");
const btnHist = document.getElementById("btnHist");
const pageJour = document.getElementById("pageJour");
const pageHist = document.getElementById("pageHist");

// Ancien code (gardé au cas ou)
// function showTab()
// {
//     if (I_i < tabNum.length)
//     {
//         const I_val = A_tabNum[I_i];
//         zone.textContent = I_val;
//         changeStyle(I_val);
//         I_i++;
//         setInterval(showTab, delay);
//     }
//     else
//     {
//         clearInterval(intervalID);
//     }
// }

setInterval(function ()
{
    if (I_i > 0 && I_i <= 20)
    {
        showHistory(A_tabNum[I_i - 1]);
    }

    const I_val = A_tabNum[I_i];
    zone.textContent = I_val;
    addStyleAndComment(I_val);
    I_i++;
}, delay);

function addStyleAndComment(value)
{
    /* Sans un remove de classList le style gardé sera celui du chiffre le + grand*/
    zone.classList.remove(
        "styleBlue", "styleGreen", "styleOrange","styleRed"
    )
    comment.textContent = "";

    if (value >= -10 && value < 0)
    {
        comment.textContent = "Brrrrrrr, un peu froid ce matin, mets ta cagoule !";
        zone.classList.add("styleBlue");
    }
    else if (value >= 0 && value < 20)
    {
        zone.classList.add("styleGreen");
    }
    else if (value >= 20 && value < 30)
    {
        zone.classList.add("styleOrange");
    }
    else if (value >= 30 && value <= 40)
    {
        comment.textContent = "Caliente ! Vamos a la playa, ho hoho hoho !!";
        zone.classList.add("styleRed");
    }
}

function showHistory(previousValue)
{
    const history = document.createElement("div");
    history.textContent = "Jour " + (I_i - 1) + " : "  + previousValue + "°C";
    tempPrec.appendChild(history);
}

btnJour.addEventListener("click", () => {
    btnJour.classList.add("active");
    btnHist.classList.remove("active");
    pageJour.hidden = false;
    pageHist.hidden = true;
});

btnHist.addEventListener("click", () => {
    btnJour.classList.remove("active");
    btnHist.classList.add("active");
    pageHist.hidden = false;
    pageJour.hidden = true;
});