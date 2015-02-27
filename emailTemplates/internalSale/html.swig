<img src="{{baseUrl}}/img/logo.png"/>

<h1>Nueva venta!</h1>
<h2>Hay que correr a imprimir!</h2>

<p>
  Confirmacion de compra:
  <ul>
    <li>Order: {{order.id}}</li>
    <li>Precio: ${{printablePrice}}</li>
    <li>Direccion: {{order.address}}</li>
    <li>Nombre: {{order.user.username}}</li>
    <li>Correo: {{order.email}}</li>
    <li>Telefono: {{order.phone}}</li>
  </ul>

  En breve estaremos contactandote para afinar los detalles de tu envio!

  - Santiago
</p>
