package com.foe.timetable.service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    // Cache of active reset codes: key = email (lowercase), value = OtpInfo
    private final Map<String, OtpInfo> otpCache = new ConcurrentHashMap<>();

    public static class OtpInfo {
        private final String code;
        private final LocalDateTime expiresAt;
        private final Integer userId;

        public OtpInfo(String code, LocalDateTime expiresAt, Integer userId) {
            this.code = code;
            this.expiresAt = expiresAt;
            this.userId = userId;
        }

        public String getCode() { return code; }
        public LocalDateTime getExpiresAt() { return expiresAt; }
        public Integer getUserId() { return userId; }
    }

    /**
     * Generates a 6-digit numeric OTP, caches it for 15 minutes, and sends it to the user's email.
     */
    public String generateAndSendResetCode(String toEmail, Integer userId, String recipientName) {
        String cleanEmail = toEmail.trim().toLowerCase();
        String code = String.format("%06d", new Random().nextInt(900000) + 100000);
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(15);

        otpCache.put(cleanEmail, new OtpInfo(code, expiresAt, userId));

        // Attempt sending via JavaMailSender
        if (mailSender != null) {
            try {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setTo(cleanEmail);
                message.setSubject("Password Reset Verification Code - FOE Timetable Portal");
                message.setText(
                    "Dear " + (recipientName != null ? recipientName : "Student/Staff") + ",\n\n" +
                    "We received a request to reset your password for the Faculty of Engineering Timetable Management System.\n\n" +
                    "Your 6-Digit Password Reset Verification Code is:\n\n" +
                    "       >>> " + code + " <<<\n\n" +
                    "This code will expire in 15 minutes.\n" +
                    "If you did not request this password reset, please ignore this email or contact the system administrator.\n\n" +
                    "Best regards,\n" +
                    "Faculty of Engineering\n" +
                    "University of Ruhuna"
                );
                mailSender.send(message);
                System.out.println("[EMAIL SENT] Successfully dispatched password reset code to: " + cleanEmail);
            } catch (Exception e) {
                System.err.println("[EMAIL WARNING] Could not send via SMTP mail sender (" + e.getMessage() + "). Generated OTP: " + code);
            }
        } else {
            System.out.println("[EMAIL SIMULATION] SMTP not configured. Active verification code for " + cleanEmail + " is: " + code);
        }

        return code;
    }

    /**
     * Verifies that the supplied OTP matches and is not expired.
     */
    public boolean verifyResetCode(String email, String enteredCode) {
        if (email == null || enteredCode == null) return false;
        String cleanEmail = email.trim().toLowerCase();
        OtpInfo info = otpCache.get(cleanEmail);

        if (info == null) return false;
        if (LocalDateTime.now().isAfter(info.getExpiresAt())) {
            otpCache.remove(cleanEmail);
            return false;
        }

        return info.getCode().equals(enteredCode.trim());
    }

    /**
     * Invalidates the reset code once successfully used.
     */
    public void clearResetCode(String email) {
        if (email != null) {
            otpCache.remove(email.trim().toLowerCase());
        }
    }
}
