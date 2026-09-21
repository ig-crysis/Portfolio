<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

// NOTE: this file is currently unused — contact.html sends via EmailJS
// client-side instead. Kept for reference only. If you revive it, copy
// mail-config.sample.php to mail-config.php (gitignored) first.
$mailConfigPath = __DIR__ . '/../../mail-config.php';
if (!file_exists($mailConfigPath)) {
    http_response_code(500);
    die('Mail is not configured. Copy mail-config.sample.php to mail-config.php.');
}
$mailConfig = require $mailConfigPath;

//Load Composer's autoloader
require __DIR__ . '/../../vendor/autoload.php';

if(isset($_POST['dataSubmit'])) {
    $name = $_POST['name'];
    $email = $_POST['email'];
    $subject = $_POST['subject'];
    $message = $_POST['message'];

    // Check if any required fields are empty
    if (empty($name) || empty($email) || empty($subject) || empty($message)) {
        echo 'Please fill in all the fields and try again.';
        exit;
    }

$mail = new PHPMailer(true);

	try {
		//Server settings
		$mail->SMTPDebug = SMTP::DEBUG_SERVER;                      //Enable verbose debug output
		$mail->isSMTP();                                            //Send using SMTP
		$mail->Host       = 'smtp.gmail.com';                     //Set the SMTP server to send through
		$mail->SMTPAuth   = true;                                   //Enable SMTP authentication
		$mail->Username   = $mailConfig['smtp_username'];                     //SMTP username
		$mail->Password   = $mailConfig['smtp_password'];                               //SMTP password
		$mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;            //Enable implicit TLS encryption
		$mail->Port       = 587;                                    //TCP port to connect to; use 587 if you have set `SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS`

		//Recipients
		$mail->setFrom($mailConfig['smtp_username'], 'CONTACTED');
		$mail->addAddress($mailConfig['to_email'], $mailConfig['to_name']);     //Add a recipient

		//Content
		$mail->isHTML(true);                                  //Set email format to HTML
		$mail->Subject = 'New Enquiry Recieved';
		$mail->Body    = '<h3>Hello, You got a new Enquiry</h3>
			<h4>Name:'.$name.'</h4>	
			<h4>Email:'.$email.'</h4>
			<h4>Subject:'.$subject.'</h4>
			<h4>Message:'.$message.'</h4>
		';

		if ($mail->send()) 
		{
			echo 'Thank You! We will be in touch with you very soon.';
		} else {
			echo 'Sorry, there was an error sending your message. Please try again.';
		}
	} catch(Exception $e) {
		echo "Message could not be sent. Mailer Error: {$mail->ErrorInfo}";
	}
}
else{
	header('Location: index.html');
	exit(0);
}
?>
