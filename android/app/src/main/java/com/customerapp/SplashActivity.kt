package com.customerapp

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.widget.VideoView
import androidx.appcompat.app.AppCompatActivity

class SplashActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_splash)

        val videoView = findViewById<VideoView>(R.id.videoView)
        val videoUri = Uri.parse("android.resource://" + packageName + "/" + R.raw.splash_screen_video)
        videoView.setVideoURI(videoUri)

        videoView.setOnCompletionListener {
            startActivity(Intent(this, MainActivity::class.java))
            finish()
        }

        videoView.setOnErrorListener { _, _, _ ->
            // If video fails to load, wait 3 seconds then proceed
            Handler(Looper.getMainLooper()).postDelayed({
                startActivity(Intent(this, MainActivity::class.java))
                finish()
            }, 3000)
            true
        }

        videoView.start()
    }
}


