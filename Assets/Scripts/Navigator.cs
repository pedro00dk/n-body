using System;
using UnityEngine;

public class Navigator : MonoBehaviour
{
    public float Speed;
    public float BoostMultiplier;
    public float TimeFromZeroToMaxSpeed;
    public float TimeFromMaxSpeedToZero;
    public Vector2 RotationSpeed;

    private Vector3 movementVelocitySmooth;
    private Vector3 rotationVelocitySmooth;

    private void Update()
    {
        float forward = Input.GetAxisRaw("Vertical");
        float side = Input.GetAxisRaw("Horizontal");
        bool boost = Input.GetKey(KeyCode.LeftShift);

        transform.position = Vector3.SmoothDamp(
            transform.position,
            transform.position + (transform.forward * forward + transform.right * side) * Speed * (boost ? BoostMultiplier : 1),
            ref movementVelocitySmooth,
            Mathf.Abs(forward) > 0.1f || Mathf.Abs(side) > 0.1f ? TimeFromZeroToMaxSpeed : TimeFromMaxSpeedToZero
        );

        Vector2 rotation = new Vector2(Input.GetAxisRaw("Mouse X"), Input.GetAxisRaw("Mouse Y"));
        Vector3 localEulerAngles = transform.localEulerAngles;
        transform.localEulerAngles = Vector3.SmoothDamp(
            localEulerAngles,
            localEulerAngles + Vector3.right * rotation.y * RotationSpeed.y + Vector3.up * rotation.x * RotationSpeed.x,
            ref rotationVelocitySmooth,
            0.5f
        );
    }
}